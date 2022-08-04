import datetime
import glob
import json
import os
import random
import re
import time

import numpy as np
import pandas as pd
import requests
import streamlit as st
from bs4 import BeautifulSoup
from pyecharts import options as opts
from pyecharts.charts import Bar
from streamlit_echarts import st_pyecharts

from utils import df2aggrid, split_words

# import matplotlib


pencbirc = "cbirc"
# mapfolder = '../temp/citygeo.csv'

# choose orgname index
org2name = {"银保监会机关": "jiguan", "银保监局本级": "benji", "银保监分局本级": "fenju", "": ""}

# @st.cache(allow_output_mutation=True)
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


# @st.cache(allow_output_mutation=True)
def get_cbircanalysis(orgname):
    org_name_index = org2name[orgname]
    beginwith = "cbircanalysis" + org_name_index
    pendf = get_csvdf(pencbirc, beginwith)
    # if pendf is not empty
    if len(pendf) > 0:
        # format date
        pendf["发布日期"] = pd.to_datetime(pendf["发布日期"]).dt.date
        # fillna
        pendf.fillna("", inplace=True)
    else:
        pendf = pd.DataFrame()
    return pendf


# @st.cache(allow_output_mutation=True)
def get_cbircdetail(orgname):
    org_name_index = org2name[orgname]

    beginwith = "cbircdtl" + org_name_index
    d0 = get_csvdf(pencbirc, beginwith)
    # reset index
    d1 = d0[["title", "subtitle", "date", "doc", "id"]].reset_index(drop=True)
    # format date
    d1["date"] = pd.to_datetime(d1["date"]).dt.date
    # update column name
    d1.columns = ["标题", "文号", "发布日期", "内容", "id"]
    # fillna
    d1.fillna("", inplace=True)
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
    org_name_index = org2name[orgname]
    beginwith = "cbircsum" + org_name_index
    pendf = get_csvdf(pencbirc, beginwith)
    # format date
    pendf["发布日期"] = pd.to_datetime(pendf["publishDate"]).dt.date
    return pendf


def get_cbirctoupd(orgname):
    org_name_index = org2name[orgname]
    beginwith = "cbirctoupd" + org_name_index
    pendf = get_csvdf(pencbirc, beginwith)
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
    # split words
    wenhao_text = split_words(wenhao_text)
    people_text = split_words(people_text)
    event_text = split_words(event_text)
    law_text = split_words(law_text)
    penalty_text = split_words(penalty_text)
    org_text = split_words(org_text)

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
    # split words
    title_text = split_words(title_text)
    wenhao_text = split_words(wenhao_text)
    event_text = split_words(event_text)
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
    # showgraph1 = st.sidebar.checkbox("按发文时间统计", key="showgraph1")
    showgraph1 = True
    if showgraph1:
        x_data = df_month_count["month"].tolist()
        y_data = df_month_count["count"].tolist()
        # draw echarts bar chart
        # bar = (
        #     Bar()
        #     .add_xaxis(xaxis_data=x_data)
        #     .add_yaxis(series_name="数量", y_axis=y_data, yaxis_index=0)
        #     .set_global_opts(
        #         title_opts=opts.TitleOpts(title="按发文时间统计"),
        #         visualmap_opts=opts.VisualMapOpts(max_=max(y_data), min_=min(y_data)),
        #     )
        # )
        # # use events
        # events = {
        #     "click": "function(params) { console.log(params.name); return params.name }",
        #     # "dblclick":"function(params) { return [params.type, params.name, params.value] }"
        # }
        # use events
        # yearmonth = st_pyecharts(bar, events=events)
        yearmonth = print_bar(x_data, y_data, "处罚数量", "按发文时间统计")
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
    # st.sidebar.metric("总数:", total)
    st.markdown("### 搜索结果" + "(" + str(total) + "条)")
    # display download button
    st.download_button(
        "下载搜索结果", data=search_dfnew.to_csv().encode("utf_8_sig"), file_name="搜索结果.csv"
    )
    # display columns
    # discols = ["发布日期", "名称", "机构", "链接"]
    # # get display df
    # display_df = search_dfnew[discols]

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
    # get sumeventdf
    # currentsum = get_cbirctempsum(orgname)
    # get detail
    oldsum = get_cbircdetail(orgname)
    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["id"].tolist()
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
        # save to update dtl list
        toupdname = "cbirctoupd" + org_name_index
        savedf(newdf, toupdname)
    return newdf


# update toupd
def update_toupd(orgname):
    org_name_index = org2name[orgname]
    # get sumeventdf
    currentsum = get_cbircsum(orgname)
    # get detail
    oldsum = get_cbircdetail(orgname)
    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["id"].tolist()
    currentidls = currentsum["docId"].tolist()
    # get current idls not in oldidls
    newidls = [x for x in currentidls if x not in oldidls]
    newdf = currentsum[currentsum["docId"].isin(newidls)]
    # if newdf is not empty, save it
    if newdf.empty is False:
        newdf.reset_index(drop=True, inplace=True)
        # save to update dtl list
        toupdname = "cbirctoupd" + org_name_index
        savedf(newdf, toupdname)
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
    baseurl = "https://www.cbirc.gov.cn/cbircweb/DocInfo/SelectByDocId?docId="
    resultls = []
    errorls = []
    count = 0
    for i in docidls:
        st.info("id: " + str(i))
        st.info(str(count) + " begin")
        url = baseurl + str(i)  # + ".json"
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


# print bar graphs
def print_bar(x_data, y_data, y_axis_name, title):
    # draw echarts bar chart
    bar = (
        Bar()
        .add_xaxis(xaxis_data=x_data)
        .add_yaxis(series_name=y_axis_name, y_axis=y_data, yaxis_index=0)
        .set_global_opts(
            title_opts=opts.TitleOpts(title=title),
            xaxis_opts=opts.AxisOpts(axislabel_opts=opts.LabelOpts(rotate=-15)),
            visualmap_opts=opts.VisualMapOpts(max_=max(y_data), min_=min(y_data)),
        )
    )
    # use events
    events = {
        "click": "function(params) { console.log(params.name); return params.name }",
        # "dblclick":"function(params) { return [params.type, params.name, params.value] }"
    }
    # use events
    clickevent = st_pyecharts(bar, events=events, height=400)
    return clickevent


# update the analysis data
def update_cbircanalysis(orgname):
    org_name_index = org2name[orgname]
    # get cbirc detail
    newdf = get_cbircdetail(orgname)
    # get id list
    newidls = newdf["id"].tolist()
    # get cbirc analysis details
    olddf = get_cbircanalysis(orgname)
    # if olddf is not empty
    if olddf.empty:
        oldidls = []
    else:
        oldidls = olddf["id"].tolist()
    # get new idls not in oldidls
    newidls = [x for x in newidls if x not in oldidls]

    upddf = newdf[newdf["id"].isin(newidls)]
    # if newdf is not empty, save it
    if upddf.empty is False:
        splitdf = split_eventdoc(upddf)
        updlen = len(splitdf)
        st.info("拆分了" + str(updlen) + "条数据")
        # combine with olddf
        upddf1 = pd.concat([splitdf, olddf])
        # # reset index
        upddf1.reset_index(drop=True, inplace=True)
        savename = "cbircanalysis" + org_name_index + get_now()
        savedf(upddf1, savename)


# extract df by regex pattern matching
def extract_info(d1, pat):
    cols = ["标题", "文号", "发布日期", "doc1", "id"]
    ex1 = d1["doc1"].str.extract(pat)
    d2 = pd.concat([d1[cols], ex1], axis=1)
    r1 = d2[d2[0].notnull()]
    d3 = d2[d2[0].isnull()]
    return r1, d3


# split info from eventdf
def split_eventdoc(d1):
    # clean up
    d1["doc1"] = d1["内容"].str.replace(r"\r|\n|\t|\xa0|\u3000|\s|\xa0", "")
    # pat1 = r"行政处罚决定书文号(.*)被处罚当事人(.*)主要违法违规事实（案由）(.*)行政处罚依据(.*)行政处罚决定(.*)作出处罚决定的机关名称(.*)作出处罚决定的日期(.*)"
    # r1, d2 = extract_info(d1, pat1)
    # pat2 = r"行政处罚决定书文号(.*)被处罚当事人(.*)主要违法违规事实（案由）(.*)行政处罚依据(.*)行政处罚决定(.*)作出行政处罚决定的机关名称(.*)作出处罚决定的日期(.*)"
    # r2, d3 = extract_info(d2, pat2)
    # pat3 = r"行政处罚决定书文号(.*)被处罚当事人(.*)主要违法违规事实（案由）(.*)行政处罚依据(.*)行政处罚决定(.*)作出行政处罚决定的机关名称(.*)作出行政处罚决定的日期(.*)"
    # r3, d4 = extract_info(d3, pat3)
    # pat4 = r"行政处罚决定书文号(.*)被处罚当事人(.*)主要违法违规事实(.*)行政处罚依据(.*)行政处罚决定(.*)作出处罚决定的机关名称(.*)作出处罚决定的日期(.*)"
    # r4, d5 = extract_info(d4, pat4)
    # pat5 = r"处罚决定书文号(.*)被处罚当事人(.*)主要违法事实（案由）(.*)行政处罚依据(.*)行政处罚决定(.*)作出行政处罚的机关名称(.*)作出处罚决定的日期(.*)"
    # r5, d6 = extract_info(d5, pat5)
    # pat6 = (
    #     r"行政处罚决定书文号(.*)被处罚当事人(.*)案由(.*)行政处罚依据(.*)行政处罚决定(.*)作出处罚决定的机关名称(.*)作出处罚决定的日期(.*)"
    # )
    # r6, d7 = extract_info(d6, pat6)

    pat6 = r"(?:(?:行政处罚决定书文号|处罚决定书文号|行政处罚决定书文号|行政处罚决定文书号|行政处罚决定书号|行政处罚文书号|行政处罚决定文号)(.*?))(?:被处罚当事人|被处罚人|被处罚单位|单位名称|被处罚机构情况|被处罚个人)(.*?)(?:主要违法违规事实（案由）|主要违法违规事实|主要违法事实（案由）|案由|主要违法事实)(.*)行政处罚依据(.*)(?:行政处罚决定|行政处罚种类及金额|行政处理决定|行政处罚种类)(.*)(?:作出处罚决定的机关名称|作出行政处罚的机关名称|作出行政处罚决定的机关名称|做出处罚决定的机关名称|作出处罚的机关|作出处罚决定机关名称)(.*?)(?:(?:作出处罚决定的日期|作出行政处罚决定的日期|做出处罚决定的日期|出行政处罚决定的日期|作出处罚的日期)(.*))?$"
    r6, d7 = extract_info(d1, pat6)

    pat7 = r"([^，,：、]+罚[^，,：、]*?号.?)((?:被处罚|当事人|受处罚|姓名|名称|单位).*?)((?:现场检查|经检查|根据举报|。|经抽查|我|你|近期|一、|一、违法|一、经查|我局对|依据《|根据《|经查|我局自|我局于|我局在|依据有关法律|\d{4}年\d?\d月\d?\d日起|\d{4}年\d?\d月\d?\d日至|\d{4}年).*?。)((?:依据原《|上述|你公司|你作为|上述事实|综上|我局认为|上述未|上述行为|上述违法|根据|依据《|以上行为|该公司上述).*。)(.*?)((?:\d\d\d\d|.{4})年[^，,、]*日)"
    r7, d8 = extract_info(d7, pat7)
    pat8 = r"((?:被处罚|当事人：|受处罚|姓名).*?)((?:。|我|你|近期|一、违法|一、经查|我局对|依据《|根据《|经查|我局自|我局于|我局在|依据有关法律|\d{4}年\d?\d月\d?\d日起|\d{4}年\d?\d月\d?\d日至|\d{4}年\d?\d月\d?\d日).*?。)((?:你公司|你作为|上述事实|综上|我局认为|上述未|上述行为|上述违法|根据|依据《|以上行为|该公司上述).*。)(.*?)((?:\d\d\d\d|.{4})年[^，,、]*日)"
    r8, d9 = extract_info(d8, pat8)
    pat9 = (
        r"(.*?)((?:我分局|我会|本会|经查|你公司|依据).*?。)([^。]*?(?:依据|我局|根据).*。)(中国[^。]*)(.{4}年.*)"
    )
    r9, d10 = extract_info(d9, pat9)

    comdf = r6
    [["标题", "文号", "发布日期", "doc1", "id", 0, 1, 2, 3, 4, 5, 6]]
    comdfcols = [
        "标题",
        "文号",
        "发布日期",
        "doc1",
        "id",
        "行政处罚决定书文号",
        "被处罚当事人",
        "主要违法违规事实",
        "行政处罚依据",
        "行政处罚决定",
        "作出处罚决定的机关名称",
        "作出处罚决定的日期",
    ]
    comdf.columns = comdfcols
    # st.write(comdf)

    r7 = generate_lawls(r7)
    # convert column list to string
    r7["lawls"] = r7["lawls"].apply(lambda x: "，".join(x))
    r7.columns = [
        "标题",
        "文号",
        "发布日期",
        "doc1",
        "id",
        "行政处罚决定书文号",
        "被处罚当事人",
        "主要违法违规事实",
        "行政处罚决定",
        "作出处罚决定的机关名称",
        "作出处罚决定的日期",
        "行政处罚依据",
    ]
    # st.write(r7)

    r8 = generate_lawls(r8)
    # convert column list to string
    r8["lawls"] = r8["lawls"].apply(lambda x: "，".join(x))
    r8.columns = [
        "标题",
        "文号",
        "发布日期",
        "doc1",
        "id",
        "被处罚当事人",
        "主要违法违规事实",
        "行政处罚决定",
        "作出处罚决定的机关名称",
        "作出处罚决定的日期",
        "行政处罚依据",
    ]
    # st.write(r8)

    r9 = generate_lawls(r9)
    # convert column list to string
    r9["lawls"] = r9["lawls"].apply(lambda x: "，".join(x))
    r9.columns = [
        "标题",
        "文号",
        "发布日期",
        "doc1",
        "id",
        "被处罚当事人",
        "主要违法违规事实",
        "行政处罚决定",
        "作出处罚决定的机关名称",
        "作出处罚决定的日期",
        "行政处罚依据",
    ]
    # st.write(r9)
    st.markdown("### 拆分失败的数量: " + str(len(d10)))
    r10 = d10[["标题", "文号", "发布日期", "doc1", "id"]]
    r10 = generate_lawls(r10)
    # convert column list to string if item is list

    r10["lawls"] = r10["lawls"].apply(
        lambda x: "，".join(x) if isinstance(x, list) else x
    )
    r10.columns = [
        "标题",
        "文号",
        "发布日期",
        "doc1",
        "id",
        "行政处罚依据",
    ]
    r10["主要违法违规事实"] = r10["doc1"]
    st.write(r10)
    # combine all df
    alldf = pd.concat([comdf, r7, r8, r9, r10])
    return alldf


def generate_lawls(d1):
    compat = "(?!《).(《[^,，；。]*?》[^；。]*?第[^,，；。《]*条)"
    compat2 = "(?!《).(《[^,，；。]*?》)"

    d1["lawls"] = d1["doc1"].str.extractall(compat).groupby(level=0)[0].apply(list)
    d1["lawls"].fillna(
        d1["doc1"].str.extractall(compat2).groupby(level=0)[0].apply(list), inplace=True
    )
    return d1


# convert eventdf to lawdf
def generate_lawdf(d1):
    # clean up
    d1["doc1"] = d1["内容"].str.replace(r"\r|\n|\t|\xa0|\u3000|\s|\xa0", "")
    # compat = "(?!《).(《[^,，；。]*?》[^；。]*?第[^,，；。《]*条)"
    # compat2 = "(?!《).(《[^,，；。]*?》)"

    # d1["lawls"] = d1["doc1"].str.extractall(compat).groupby(level=0)[0].apply(list)
    # d1["lawls"].fillna(
    #     d1["doc1"].str.extractall(compat2).groupby(level=0)[0].apply(list), inplace=True
    # )
    d1 = generate_lawls(d1)
    d1["处理依据"] = d1["lawls"].fillna("").apply(lawls2dict)

    d2 = d1[["id", "处理依据"]]
    d3 = d2.explode("处理依据")
    d4 = d3["处理依据"].apply(pd.Series)
    d5 = pd.concat([d3, d4], axis=1)
    d6 = d5.explode("条文")
    # reset index
    d6.reset_index(drop=True, inplace=True)
    savedf(d6, "cbirclawdf")
    return d6


def lawls2dict(ls):
    try:
        result = []
        for item in ls:
            lawdict = dict()
            lawls = re.findall(r"《(.*?)》", item)
            #         print(lawls)
            artls = re.findall(r"(第[^《》、和章节款（）]*?条)", item)
            #         print(artls)
            lawdict["法律法规"] = lawls[0]
            lawdict["条文"] = artls
            result.append(lawdict)
        return result
    except Exception as e:
        st.error(str(e))
        return np.nan
