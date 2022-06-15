import datetime
import glob
import json
import os
import random
import time

import pandas as pd
import requests
import streamlit as st
from bs4 import BeautifulSoup
from pyecharts import options as opts
from pyecharts.charts import Bar
from streamlit_echarts import st_pyecharts

from utils import df2aggrid

# import matplotlib


pencbirc = "cbirc"
# mapfolder = '../temp/citygeo.csv'

# choose orgname index
org2name = {
    "银保监会机关": "jiguan",
    "银保监局本级": "benji",
    "银保监分局本级": "fenju",
}


def get_csvdf(penfolder, beginwith):
    files2 = glob.glob(penfolder + "**/" + beginwith + "*.csv", recursive=True)
    dflist = []
    # filelist = []
    for filepath in files2:
        pendf = pd.read_csv(filepath)
        dflist.append(pendf)
        # filelist.append(filename)
    if len(dflist) > 0:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df


# @st.cache(suppress_st_warning=True)
def get_cbircanalysis():
    pendf = get_csvdf(pencbirc, "cbircanalysis")
    # format date
    pendf["发布日期"] = pd.to_datetime(pendf["date"]).dt.date
    return pendf


def get_cbircdetail(orgname):
    beginwith = "cbircdtl" + orgname
    d0 = get_csvdf(pencbirc, beginwith)
    # reset index
    d1 = d0[["title", "subtitle", "date", "doc",'id']].reset_index(drop=True)
    # format date
    d1["date"] = pd.to_datetime(d1["date"]).dt.date
    # update column name
    d1.columns = ["标题", "文号", "发布日期", "内容",'id']
    return d1


def display_cbircsum(df):
    # get length of old eventdf
    oldlen = len(df)
    # get min and max date of old eventdf
    min_date = df["发布日期"].min()
    max_date = df["发布日期"].max()
    # use metric for length and date
    col1, col2 = st.columns([1, 3])
    col1.metric("案例总数", oldlen)
    col2.metric("日期范围", f"{min_date} - {max_date}")


def get_cbircsum(orgname):
    beginwith = "cbircsum" + orgname
    pendf = get_csvdf(pencbirc, beginwith)
    # format date
    pendf["发布日期"] = pd.to_datetime(pendf["publishDate"]).dt.date
    return pendf


def searchcbirc(
    df,
    start_date,
    end_date,
    wenhao_text,
    people_text,
    event_text,
    law_text,
    penalty_text,
    org_text,
):
    cols = [
        "发布日期",
        "行政处罚决定书文号",
        "被处罚当事人",
        "主要违法违规事实",
        "行政处罚依据",
        "行政处罚决定",
        "作出处罚决定的机关名称",
        "作出处罚决定的日期",
    ]
    # search by start_date and end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
    searchdf = df[
        (df["发布日期"] >= start_date)
        & (df["发布日期"] <= end_date)
        & (df["行政处罚决定书文号"].str.contains(wenhao_text))
        & df["被处罚当事人"].str.contains(people_text)
        & df["主要违法违规事实"].str.contains(event_text)
        & df["行政处罚依据"].str.contains(law_text)
        & df["行政处罚决定"].str.contains(penalty_text)
        & df["作出处罚决定的机关名称"].str.contains(org_text)
    ][cols]
    # sort by date desc
    searchdf.sort_values(by=["发布日期"], ascending=False, inplace=True)
    # reset index
    searchdf.reset_index(drop=True, inplace=True)
    return searchdf


# search by title, subtitle, date, doc
def searchdtl(
    df,
    start_date,
    end_date,
    title_text,
    wenhao_text,
    event_text,
):
    cols = ["标题", "文号", "发布日期", "内容"]
    # search by start_date and end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
    searchdf = df[
        (df["发布日期"] >= start_date)
        & (df["发布日期"] <= end_date)
        & (df["标题"].str.contains(title_text))
        & (df["文号"].str.contains(wenhao_text))
        & (df["内容"].str.contains(event_text))
    ][cols]
    # sort by date desc
    searchdf.sort_values(by=["发布日期"], ascending=False, inplace=True)
    # reset index
    searchdf.reset_index(drop=True, inplace=True)
    return searchdf


# count the number of df by month
def count_by_month(df):
    df_month = df.copy()
    # count by month
    df_month["month"] = df_month["发布日期"].apply(lambda x: x.strftime("%Y-%m"))
    df_month_count = df_month.groupby(["month"]).size().reset_index(name="count")
    return df_month_count


# display dfmonth in plotly
def display_dfmonth(df):
    df_month = df.copy()
    # count by month
    df_month["month"] = df_month["发布日期"].apply(lambda x: x.strftime("%Y-%m"))
    df_month_count = df_month.groupby(["month"]).size().reset_index(name="count")
    # display checkbox to show/hide graph1
    showgraph1 = st.sidebar.checkbox("按发文时间统计", key="showgraph1")

    if showgraph1:
        x_data = df_month_count["month"].tolist()
        y_data = df_month_count["count"].tolist()
        # draw echarts bar chart
        bar = (
            Bar()
            .add_xaxis(xaxis_data=x_data)
            .add_yaxis(series_name="数量", y_axis=y_data, yaxis_index=0)
            .set_global_opts(title_opts=opts.TitleOpts(title="按发文时间统计"))
        )
        # use events
        events = {
            "click": "function(params) { console.log(params.name); return params.name }",
            # "dblclick":"function(params) { return [params.type, params.name, params.value] }"
        }
        # use events
        yearmonth = st_pyecharts(bar, events=events)
        # st.write(yearmonth)
        if yearmonth is not None:
            # get year and month value from format "%Y-%m"
            # year = int(yearmonth.split("-")[0])
            # month = int(yearmonth.split("-")[1])
            # filter date by year and month
            searchdfnew = df_month[df_month["month"] == yearmonth]
            # drop column "month"
            searchdfnew.drop(columns=["month"], inplace=True)

            # set session state
            st.session_state["search_result_cbirc"] = searchdfnew


# display event detail
def display_eventdetail(search_df):
    # draw figure
    display_dfmonth(search_df)
   # get search result from session
    search_dfnew = st.session_state["search_result_cbirc"]
    total = len(search_dfnew)
    st.sidebar.metric("总数:", total)
    st.markdown("### 搜索结果")
    # st.table(search_df)
    data = df2aggrid(search_dfnew)
    # display data
    selected_rows = data["selected_rows"]
    if selected_rows == []:
        st.error("请先选择查看案例")
        st.stop()
    # convert selected_rows to dataframe
    selected_rows_df = pd.DataFrame(selected_rows)
    # transpose and set column name
    selected_rows_df = selected_rows_df.T
    selected_rows_df.columns = ["内容"]
    # display selected rows
    st.table(selected_rows_df)
    # display download button
    st.sidebar.download_button("下载搜索结果", data=search_df.to_csv(), file_name="搜索结果.csv")


# get sumeventdf in page number range
def get_sumeventdf(orgname, start, end):
    # choose orgname index
    org_index = {"银保监会机关": "4113", "银保监局本级": "4114", "银保监分局本级": "4115"}
    org_name_index = org_index[orgname]

    baseurl = (
        "https://www.cbirc.gov.cn/cbircweb/DocInfo/SelectDocByItemIdAndChild?itemId="
        + org_name_index
        + "&pageSize=18&pageIndex="
    )

    resultls = []
    errorls = []
    count = 0
    for i in range(start, end + 1):
        st.info("page: " + str(i))
        st.info(str(count) + " begin")
        url = baseurl + str(i)
        st.info("url:" + url)
        try:
            dd = requests.get(url, verify=False)
            sd = BeautifulSoup(dd.content, "html.parser")

            json_data = json.loads(str(sd.text))

            datals = json_data["data"]["rows"]

            df = pd.DataFrame(datals)
            resultls.append(df)
        except Exception as e:
            st.error("error!: " + str(e))
            errorls.append(url)

        mod = (i + 1) % 2
        if mod == 0 and count > 0:
            tempdf = pd.concat(resultls)
            savename = "tempsum-" + org_name_index + str(count + 1)
            savedf(tempdf, savename)

        wait = random.randint(2, 20)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1

    circdf = pd.concat(resultls)
    savecsv = "tempsumall" + org_name_index + str(count)
    savedf(circdf, savecsv)
    return circdf


def savedf(df, basename):
    savename = basename + ".csv"
    savepath = os.path.join(pencbirc, savename)
    df.to_csv(savepath)


# update sumeventdf
def update_sumeventdf(currentsum, orgname):
    org_name_index = org2name[orgname]

    oldsum = get_cbircsum(org_name_index)
    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["docId"].tolist()
    currentidls = currentsum["docId"].tolist()
    # print('oldidls:',oldidls)
    # print('currentidls:', currentidls)
    # get current idls not in oldidls
    newidls = [x for x in currentidls if x not in oldidls]
    # print('newidls:', newidls)
    # newidls=list(set(currentidls)-set(oldidls))
    newdf = currentsum[currentsum["docId"].isin(newidls)]
    # if newdf is not empty, save it
    if newdf.empty is False:
        newdf.reset_index(drop=True, inplace=True)
        nowstr = get_now()
        savename = "cbircsum" + org_name_index + nowstr
        savedf(newdf, savename)
    return newdf


# get current date and time string
def get_now():
    now = datetime.datetime.now()
    now_str = now.strftime("%Y%m%d%H%M%S")
    return now_str


# get event detail
def get_eventdetail(eventsum, orgname):
    org_name_index = org2name[orgname]

    docidls = eventsum["docId"].tolist()

    # baseurl = (
    #     "https://www.cbirc.gov.cn/cn/static/data/DocInfo/SelectByDocId/data_docId="
    # )
    # update baseurl
    baseurl='https://www.cbirc.gov.cn/cbircweb/DocInfo/SelectByDocId?docId='
    resultls = []
    errorls = []
    count = 0
    for i in docidls:
        st.info("id: " + str(i))
        st.info(str(count) + " begin")
        url = baseurl + str(i) #+ ".json"
        st.info("url:" + url)
        try:
            dd = requests.get(url, verify=False)
            sd = BeautifulSoup(dd.content, "html.parser")

            json_data = json.loads(str(sd.text))

            title = json_data["data"]["docTitle"]
            subtitle = json_data["data"]["docSubtitle"]
            date = json_data["data"]["publishDate"]
            doc = json_data["data"]["docClob"]
            datals = {"title": title, "subtitle": subtitle, "date": date, "doc": doc}

            df = pd.DataFrame(datals, index=[0])
            df["id"] = i
            resultls.append(df)
        except Exception as e:
            st.error("error!: " + str(e))
            st.error("check url:" + url)
            errorls.append(i)

        mod = (count + 1) % 10
        if mod == 0 and count > 0:
            tempdf = pd.concat(resultls)
            savename = "tempdtl-" + org_name_index + str(count + 1)
            savedf(tempdf, savename)

        wait = random.randint(2, 20)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1
    # if resultls is not empty, save it
    if resultls:
        circdf = pd.concat(resultls)
        savecsv = "cbircdtl" + org_name_index + get_now()
        savedf(circdf, savecsv)
    else:
        circdf = pd.DataFrame()
    return circdf
