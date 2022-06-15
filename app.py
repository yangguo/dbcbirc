import pandas as pd
import streamlit as st

from dbcbirc import (
    display_cbircsum,
    display_eventdetail,
    get_cbircanalysis,
    get_cbircdetail,
    get_cbircsum,
    get_eventdetail,
    get_sumeventdf,
    searchcbirc,
    searchdtl,
    update_sumeventdf,
)


def main():

    menu = [
        "案例搜索",
        "案例更新",
    ]
    choice = st.sidebar.selectbox("选择", menu)

    if choice == "案例更新":
        st.subheader("案例更新")
        # jiguan oldsum
        st.markdown("#### 银保监会机关")
        st.markdown("列表")
        oldsumjiguan = get_cbircsum("jiguan")
        display_cbircsum(oldsumjiguan)
        st.markdown("详情")
        dtljiguan = get_cbircdetail("jiguan")
        display_cbircsum(dtljiguan)
        # benji oldsum
        st.markdown("#### 银保监局本级")
        st.markdown("列表")
        oldsumbenji = get_cbircsum("benji")
        display_cbircsum(oldsumbenji)
        st.markdown("详情")
        dtlbenji = get_cbircdetail("benji")
        display_cbircsum(dtlbenji)
        # fenju oldsum
        st.markdown("#### 银保监分局本级")
        st.markdown("列表")
        oldsumfenju = get_cbircsum("fenju")
        display_cbircsum(oldsumfenju)
        st.markdown("详情")
        dtlfenju = get_cbircdetail("fenju")
        display_cbircsum(dtlfenju)

        with st.sidebar.form("更新案例"):
            # choose orgname index
            org_name = st.selectbox("机构", ["银保监会机关", "银保监局本级", "银保监分局本级"])
            # choose page start number and end number
            start_num = st.number_input("起始页", value=1, min_value=1)
            # convert to int
            start_num = int(start_num)
            end_num = st.number_input("结束页",value=1)
            # convert to int
            end_num = int(end_num)
            # button to scrapy web
            sumeventbutton = st.form_submit_button("更新案例")

        if sumeventbutton:
            # get sumeventdf
            sumeventdf = get_sumeventdf(org_name, start_num, end_num)
            # get length of sumeventdf
            length = len(sumeventdf)
            # display length
            st.success(f"获取了{length}条案例")
            # update sumeventdf
            newsum = update_sumeventdf(sumeventdf, org_name)
            # get length of newsum
            sumevent_len = len(newsum)
            # display sumeventdf
            st.success(f"共{sumevent_len}条案例待更新")
            # get event detail
            eventdetail = get_eventdetail(newsum, org_name)
            # get length of eventdetail
            eventdetail_len = len(eventdetail)
            # display eventdetail
            st.success(f"更新完成，共{eventdetail_len}条案例详情")
    
        # button to refresh page
        refreshbutton = st.sidebar.button("刷新页面")
        if refreshbutton:
            st.experimental_rerun()
    

    elif choice == "案例搜索":
        st.subheader("案例搜索")
        # initialize search result in session state
        if "search_result_cbirc" not in st.session_state:
            st.session_state["search_result_cbirc"] = None
        # choose search type using radio
        search_type = st.sidebar.radio(
            "搜索类型",
            [
                "案情经过",
                "案情分类",
            ],
        )

        if search_type == "案情分类":
            # get cbircdetail
            df = get_cbircanalysis()
            # get length of old eventdf
            oldlen = len(df)
            # get min and max date of old eventdf
            min_date = df["发布日期"].min()
            max_date = df["发布日期"].max()
            # use metric
            st.sidebar.write("案例总数", oldlen)
            st.sidebar.write("最晚发文日期", max_date)
            st.sidebar.write("最早发文日期",min_date)
            # five years ago
            five_years_ago = max_date - pd.Timedelta(days=365 * 5)
            # use form
            with st.form("案情分类"):
                col1, col2 = st.columns(2)

                with col1:
                    # input date range
                    start_date = st.date_input("开始日期", value=five_years_ago)
                    end_date = st.date_input("结束日期", value=max_date)
                    # input wenhao keyword
                    wenhao_text = st.text_input("文号关键词")
                    # input people keyword
                    people_text = st.text_input("当事人关键词")

                with col2:
                    # input event keyword
                    event_text = st.text_input("案情关键词")
                    # input law keyword
                    law_text = st.text_input("处罚依据关键词")
                    # input penalty keyword
                    penalty_text = st.text_input("处罚决定关键词")
                    # input org keyword
                    org_text = st.text_input("处罚机关关键词")
                # search button
                searchbutton = st.form_submit_button("搜索")

            if searchbutton:
                # if text are all empty
                if (
                    wenhao_text == ""
                    and people_text == ""
                    and event_text == ""
                    and law_text == ""
                    and penalty_text == ""
                    and org_text == ""
                ):
                    st.warning("请输入搜索关键词")
                    # st.stop()
                # search by start_date, end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
                search_df = searchcbirc(
                    df,
                    start_date,
                    end_date,
                    wenhao_text,
                    people_text,
                    event_text,
                    law_text,
                    penalty_text,
                    org_text,
                )
                # save search_df to session state
                st.session_state["search_result_cbirc"] = search_df
            else:
                search_df = st.session_state["search_result_cbirc"]

        elif search_type == "案情经过":
            # get cbircdetail
            df = get_cbircdetail("")
            # get length of old eventdf
            oldlen = len(df)
            # get min and max date of old eventdf
            min_date = df["发布日期"].min()
            max_date = df["发布日期"].max()
            # use metric
            st.sidebar.write("案例总数", oldlen)
            st.sidebar.write("最晚发文日期", max_date)
            st.sidebar.write("最早发文日期",min_date)
            # five years ago
            five_years_ago = max_date - pd.Timedelta(days=365 * 5)
            with st.form("案情经过"):
                col1, col2 = st.columns(2)

                with col1:
                    # input date range
                    start_date = st.date_input("开始日期", value=five_years_ago)
                    # input title keyword
                    title_text = st.text_input("标题")
                    # input event keyword
                    event_text = st.text_input("案情关键词")

                with col2:
                    end_date = st.date_input("结束日期", value=max_date)
                    # input wenhao keyword
                    wenhao_text = st.text_input("文号")
                # search button
                searchbutton = st.form_submit_button("搜索")

            if searchbutton:
                # if text are all empty
                if title_text == "" and event_text == "" and wenhao_text == "":
                    st.warning("请输入搜索关键词")
                    # st.stop()
                # search by start_date, end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
                search_df = searchdtl(
                    df,
                    start_date,
                    end_date,
                    title_text,
                    wenhao_text,
                    event_text,
                )
                # save search_df to session state
                st.session_state["search_result_cbirc"] = search_df
            else:
                search_df = st.session_state["search_result_cbirc"]

        if search_df is None:
            st.error("请先搜索")
            st.stop()

        # display eventdetail
        display_eventdetail(search_df)


if __name__ == "__main__":
    main()
