import pandas as pd
import glob
import plotly.express as px
import plotly.graph_objs as go
from utils import get_summary, df2aggrid

# import matplotlib

import streamlit as st


pencbirc = 'cbirc'
# mapfolder = '../temp/citygeo.csv'

def get_csvdf(penfolder, beginwith):
    files2 = glob.glob(penfolder + '**/' + beginwith + '*.csv', recursive=True)
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
def get_cbircdetail():
    pendf = get_csvdf(pencbirc, 'cbircdtl')
    # format date
    pendf['发布日期'] = pd.to_datetime(pendf['date']).dt.date
    return pendf


def get_cbircsum():
    pendf = get_csvdf(pencbirc, 'sumevent')
    return pendf


def searchcbirc(df,start_date, end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text):
    cols = ['发布日期','行政处罚决定书文号', '被处罚当事人', '主要违法违规事实', '行政处罚依据', '行政处罚决定', '作出处罚决定的机关名称', '作出处罚决定的日期']
    # search by start_date and end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
    searchdf=df[(df['发布日期'] >= start_date) & (df['发布日期'] <= end_date)
    & (df['行政处罚决定书文号'].str.contains(wenhao_text))&
    df['被处罚当事人'].str.contains(people_text)&
    df['主要违法违规事实'].str.contains(event_text)&
    df['行政处罚依据'].str.contains(law_text)&
    df['行政处罚决定'].str.contains(penalty_text)&
    df['作出处罚决定的机关名称'].str.contains(org_text)][cols]
    # sort by date desc
    searchdf.sort_values(by=['发布日期'], ascending=False, inplace=True)
    # reset index
    searchdf.reset_index(drop=True,inplace=True)
    return searchdf


# count the number of df by month
def count_by_month(df):
    df_month = df.copy()
    # count by month
    df_month['month'] = df_month['发布日期'].apply(lambda x: x.strftime('%Y-%m'))
    df_month_count = df_month.groupby(['month']).size().reset_index(name='count')
    return df_month_count


# display dfmonth in plotly
def display_dfmonth(df_month):
    fig = go.Figure(data=[go.Bar(x=df_month['month'], y=df_month['count'])])
    fig.update_layout(title='处罚数量统计', xaxis_title='月份', yaxis_title='处罚数量')
    st.plotly_chart(fig)


# display event detail
def display_eventdetail(search_df):
    total = len(search_df)           
    st.sidebar.metric('总数:', total)
    # count by month
    df_month = count_by_month(search_df)
    # draw plotly figure
    display_dfmonth(df_month)
    # st.table(search_df)
    data=df2aggrid(search_df)
    # display data
    selected_rows = data["selected_rows"]
    if selected_rows==[]:
        st.error('请先选择查看案例')
        return
    # convert selected_rows to dataframe
    selected_rows_df = pd.DataFrame(selected_rows)
    # transpose and set column name
    selected_rows_df = selected_rows_df.T
    selected_rows_df.columns = ['内容']
    # display selected rows
    st.table(selected_rows_df)
    # display download button
    st.sidebar.download_button('下载搜索结果',
                                data=search_df.to_csv(),
                                file_name='搜索结果.csv')