import pandas as pd
import streamlit as st

from dbcbirc import (
    display_cbircsum,
    display_eventdetail,
    download_cbircsum,
    # generate_lawdf,
    get_cbirccat,
    get_cbircanalysis,
    get_cbircdetail,
    # get_cbirclabel,
    # get_cbircloc,
    get_cbircsum,
    get_cbirctoupd,
    get_eventdetail,
    # get_lawcbirc,
    get_sumeventdf,
    searchcbirc,
    searchdtl,
    # update_cbircanalysis,
    update_cbirclabel,
    update_sumeventdf,
    update_toupd,
    uplink_cbircsum,
)

# set page config
st.set_page_config(
    page_title="中国银监会监管处罚分析",
    page_icon=":bank:",
    layout="wide",
    initial_sidebar_state="expanded",
)

backendurl = "http://localhost:8000"


def main():
    menu = ["案例总数", "案例搜索", "案例更新", "案例下载", "案例分类", "案例上线"]
    org_namels = ["银保监会机关", "银保监局本级", "银保监分局本级"]
    choice = st.sidebar.selectbox("选择", menu)

    if choice == "案例总数":
        st.subheader("案例总数")
        # get cbircdetail
        dtlall = get_cbircdetail("")
        display_cbircsum(dtlall)

        for org_name in org_namels:
            st.markdown("#### " + org_name)
            dtl = get_cbircdetail(org_name)
            display_cbircsum(dtl)

    if choice == "案例更新":
        st.subheader("案例更新")

        for org_name in org_namels:
            st.markdown("#### " + org_name)
            st.markdown("列表")
            oldsum = get_cbircsum(org_name)
            display_cbircsum(oldsum)
            st.markdown("详情")
            dtl = get_cbircdetail(org_name)
            display_cbircsum(dtl)

        # choose orgname index
        org_name = st.sidebar.selectbox(
            "机构", ["银保监会机关", "银保监局本级", "银保监分局本级"]
        )
        # choose page start number and end number
        start_num = st.sidebar.number_input("起始页", value=1, min_value=1)
        # convert to int
        start_num = int(start_num)
        end_num = st.sidebar.number_input("结束页", value=1)
        # convert to int
        end_num = int(end_num)
        # Initialize session state for the update form
        if f"show_update_form_{org_name}" not in st.session_state:
            st.session_state[f"show_update_form_{org_name}"] = False

        # button to scrapy web
        sumeventbutton = st.sidebar.button("更新列表")
        if sumeventbutton:
            st.session_state[f"show_update_form_{org_name}"] = False
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

        # update detail button
        eventdetailbutton = st.sidebar.button("更新详情")
        if eventdetailbutton:
            st.session_state[f"show_update_form_{org_name}"] = True
            # st.experimental_rerun()

        if st.session_state.get(f"show_update_form_{org_name}", False):
            # Only process the selected org_name from sidebar, not all organizations
            st.markdown("#### 更新详情：" + org_name)
            # update sumeventdf
            newsum = update_toupd(org_name)
            # get length of toupd
            newsum_len = len(newsum)
            # display sumeventdf
            st.success(f"共{newsum_len}条案例待更新")
            if newsum_len > 0:
                # get toupdate list
                toupd = get_cbirctoupd(org_name)

                if not toupd.empty:
                    # Create display columns
                    display_cols = ["docId", "title", "subtitle", "publishDate"]
                    available_cols = [
                        col for col in display_cols if col in toupd.columns
                    ]

                    if available_cols:
                        display_df = toupd[available_cols].copy()
                        # Rename columns for better display
                        col_mapping = {
                            "docId": "文档ID",
                            "title": "标题",
                            "subtitle": "文号",
                            "publishDate": "发布日期",
                        }
                        display_df = display_df.rename(
                            columns={
                                k: v
                                for k, v in col_mapping.items()
                                if k in display_df.columns
                            }
                        )

                        # Initialize session state for selected rows
                        selection_key = f"selected_rows_{org_name}"
                        if selection_key not in st.session_state:
                            st.session_state[selection_key] = []

                        # Use form to prevent auto-refresh on selection
                        with st.form(key=f"selection_form_{org_name}"):
                            st.write("### 选择要更新的记录")

                            # Show the dataframe for reference with checkboxes
                            st.write(f"共 {len(display_df)} 条待更新记录:")

                            # Create checkbox options for each record with more compact display
                            selected_indices = []

                            # Display records in a more compact way with checkboxes
                            for idx, row in display_df.iterrows():
                                col1, col2 = st.columns([1, 9])

                                with col1:
                                    # Check if this record was previously selected
                                    default_value = (
                                        idx in st.session_state[selection_key]
                                    )

                                    is_selected = st.checkbox(
                                        "",
                                        value=default_value,
                                        key=f"checkbox_{org_name}_{idx}",
                                    )
                                    if is_selected:
                                        selected_indices.append(idx)

                                with col2:
                                    # Display record info in a compact format
                                    if (
                                        "文档ID" in row
                                        and "标题" in row
                                        and "发布日期" in row
                                    ):
                                        st.write(
                                            f"**{row['文档ID']}** | {row['标题'][:60]}... | {row['发布日期']}"
                                        )
                                    else:
                                        st.write(
                                            f"**{str(row.iloc[0])}** | {str(row.iloc[1])[:60]}..."
                                        )

                            # Submit button for the form
                            submitted = st.form_submit_button("确认选择并开始更新")

                        # Handle form submission outside the form
                        if submitted:
                            st.session_state[selection_key] = selected_indices
                            if selected_indices:
                                # Display progress message
                                st.info(f"正在更新选中的 {len(selected_indices)} 条记录...")

                                try:
                                    # Get selected records using loc for non-continuous indices
                                    selected_toupd = toupd.loc[
                                        selected_indices
                                    ].copy()

                                    # get event detail for selected records
                                    eventdetail = get_eventdetail(
                                        selected_toupd, org_name
                                    )
                                    # get length of eventdetail
                                    eventdetail_len = len(eventdetail)
                                    # display eventdetail
                                    st.success(f"更新完成，共{eventdetail_len}条案例详情")

                                    # Update session state to record the successful update
                                    st.session_state[
                                        f"last_update_{org_name}"
                                    ] = {
                                        "count": eventdetail_len,
                                        "indices": selected_indices,
                                    }
                                    st.session_state[
                                        selection_key
                                    ] = []  # Clear selection
                                    # st.experimental_rerun()

                                except Exception as e:
                                    st.error(f"更新失败: {e}")
                                    st.write(f"尝试更新的行索引: {selected_indices}")
                                    st.write(f"错误详情: {str(e)}")
                            else:
                                st.warning("请先选择要更新的记录")

                        # Display last update info if available
                        if f"last_update_{org_name}" in st.session_state:
                            last_update = st.session_state[
                                f"last_update_{org_name}"
                            ]
                            st.info(f"上次更新了 {last_update['count']} 条记录")

                        # Always show update all button
                        st.markdown("---")
                        if st.button(
                            f"更新全部 {newsum_len} 条记录",
                            key=f"update_all_{org_name}",
                        ):
                            # get event detail
                            eventdetail = get_eventdetail(toupd, org_name)
                            # get length of eventdetail
                            eventdetail_len = len(eventdetail)
                            # display eventdetail
                            st.success(f"更新完成，共{eventdetail_len}条案例详情")
                    else:
                        st.error(f"待更新数据缺少必要列: {display_cols}")
                else:
                    st.error("获取待更新记录失败")
            else:
                st.error("没有更新的案例")

        # button to refresh page
        # refreshbutton = st.sidebar.button("刷新页面")
        # if refreshbutton:
        #     st.experimental_rerun()

        # convert eventdf to lawdf
        # lawdfconvert = st.sidebar.button("处罚依据分析")
        # if lawdfconvert:
        #     eventdf = get_cbircdetail("")
        #     lawdf = generate_lawdf(eventdf)
        #     # savedf(lawdf,'lawdf')
        #     st.success("处罚依据分析完成")
        #     st.write(lawdf.sample(20))

        # refresh data button
        # updatebutton = st.sidebar.button("拆分数据")
        # if updatebutton:
        #     update_cbircanalysis(org_name)
        #     st.success("数据拆分完成")

    elif choice == "案例搜索":
        st.subheader("案例搜索")
        # initialize search result in session state
        if "search_result_cbirc" not in st.session_state:
            st.session_state["search_result_cbirc"] = None
        if "keywords_cbirc" not in st.session_state:  # 生成word的session初始化
            st.session_state["keywords_cbirc"] = []
        # choose search type using radio
        search_type = st.sidebar.radio(
            "搜索类型",
            [
                # "案情经过",
                "案情分类",
            ],
        )

        if search_type == "案情分类":
            # get cbircdetail
            dfdtl = get_cbircdetail("")
            # get cbircdetail
            df = get_cbircanalysis("")
            # get length of old eventdf
            # oldlen = len(df)
            # get min and max date of old eventdf
            min_date = dfdtl["发布日期"].min()
            max_date = dfdtl["发布日期"].max()
            # get cbirclabel
            # labeldf = get_cbirclabel()
            # get cbircamt
            cbircamt = get_cbirccat()
            # get lawcbirc
            # lawcbirc = get_lawcbirc()
            # get lawlist
            # lawlist = lawcbirc["法律法规"].unique()
            # get cbircloc
            # cbircloc = get_cbircloc()
            # get province list
            # provlist = cbircloc["province"].unique()
            # merge cbircdetail, cbirclabel,cbircamt and lawcbirc by id
            # dfl = pd.merge(df, labeldf, on="id", how="left")
            dfl = pd.merge(dfdtl, df, on="id", how="left")
            dfl = pd.merge(dfl, cbircamt, on="id", how="left")
            # dfl = pd.merge(dfl, lawcbirc, on="id", how="left")
            # dfl = pd.merge(dfl, cbircloc, on="id", how="left")
            # st.write(dfl)
            # one years ago
            one_year_ago = max_date - pd.Timedelta(days=365 * 1)
            # use form
            with st.form("案情分类"):
                col1, col2 = st.columns(2)

                with col1:
                    # input date range
                    start_date = st.date_input(
                        "开始日期", value=one_year_ago, min_value=min_date
                    )
                    # input wenhao keyword
                    wenhao_text = st.text_input("文号关键词")
                    # input people keyword
                    people_text = st.text_input("当事人关键词")
                    # input event keyword
                    event_text = st.text_input("案情关键词")
                    # choose industry category using multiselect in banking and insurance
                    # industry = st.multiselect("行业", ["银行", "保险"])
                    industry = st.text_input("行业")
                    # choose province using multiselect
                    # province = st.multiselect("处罚省份", provlist)
                    province = st.text_input("处罚省份")

                with col2:
                    end_date = st.date_input(
                        "结束日期", value=max_date, min_value=min_date
                    )
                    # input law keyword
                    # law_text = st.text_input("处罚依据关键词")
                    # choose law using multiselect
                    # law_text = st.multiselect("处罚依据", lawlist)
                    law_text = st.text_input("处罚依据")
                    # input penalty keyword
                    penalty_text = st.text_input("处罚决定关键词")
                    # input org keyword
                    org_text = st.text_input("处罚机关关键词")
                    # input minimum penalty amount
                    min_penalty = st.number_input("最低处罚金额", value=0)

                # search button
                searchbutton = st.form_submit_button("搜索")

            if searchbutton:
                # if text are all empty
                if (
                    wenhao_text == ""
                    and people_text == ""
                    and event_text == ""
                    # and law_text == ""
                    and penalty_text == ""
                    and org_text == ""
                ):
                    st.warning("请输入搜索关键词")
                    # st.stop()
                # if industry == []:
                #     industry = ["银行", "保险"]
                # if law_text == []:
                #     law_text = lawlist
                # if province == []:
                #     province = provlist

                st.session_state["keywords_cbirc"] = [
                    start_date,
                    end_date,
                    wenhao_text,
                    people_text,
                    event_text,
                    law_text,
                    penalty_text,
                    org_text,
                    industry,
                    min_penalty,
                    province,
                ]
                # search by start_date, end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
                search_df = searchcbirc(
                    dfl,
                    start_date,
                    end_date,
                    wenhao_text,
                    people_text,
                    event_text,
                    law_text,
                    penalty_text,
                    org_text,
                    industry,
                    min_penalty,
                    province,
                )
                # save search_df to session state
                st.session_state["search_result_cbirc"] = search_df
            else:
                search_df = st.session_state["search_result_cbirc"]

        elif search_type == "案情经过":
            # get cbircdetail
            df = get_cbircdetail("")
            # get length of old eventdf
            # oldlen = len(df)
            # get min and max date of old eventdf
            min_date = df["发布日期"].min()
            max_date = df["发布日期"].max()
            # get cbirclabel
            # cbirclabel = get_cbirclabel()
            # get cbircamt
            cbircamt = get_cbirccat()
            # st.write(cbircamt)
            # get lawcbirc
            # lawcbirc = get_lawcbirc()
            # get lawlist
            # lawlist = lawcbirc["法律法规"].unique()
            # get cbircloc
            # cbircloc = get_cbircloc()
            # get province list
            # provlist = cbircloc["province"].unique()
            # provlist = cbircamt["province"].unique()
            # get industry list
            # industrylist = cbircamt["industry"].unique()
            # merge cbircdetail, cbirclabel,cbircamt and lawcbirc by id
            # dfl = pd.merge(df, cbirclabel, on="id", how="left")
            dfl = pd.merge(df, cbircamt, on="id", how="left")
            # dfl = pd.merge(dfl, lawcbirc, on="id", how="left")
            # dfl = pd.merge(dfl, cbircloc, on="id", how="left")

            # one years ago
            one_year_ago = max_date - pd.Timedelta(days=365 * 1)
            with st.form("案情经过"):
                col1, col2 = st.columns(2)

                with col1:
                    # input date range
                    start_date = st.date_input(
                        "开始日期", value=one_year_ago, min_value=min_date
                    )
                    # input title keyword
                    title_text = st.text_input("标题")
                    # input event keyword
                    event_text = st.text_input("案情关键词")
                    # input minimum penalty amount
                    min_penalty = st.number_input("最低处罚金额", value=0)
                    # choose province using multiselect
                    # province = st.multiselect("处罚省份", provlist)
                    province = st.text_input("处罚省份")
                with col2:
                    end_date = st.date_input(
                        "结束日期", value=max_date, min_value=min_date
                    )
                    # input wenhao keyword
                    wenhao_text = st.text_input("文号")
                    # choose industry category of banking or insurance
                    # industry = st.multiselect("行业", industrylist)
                    industry = st.text_input("行业")
                    # choose reference law
                    # law_select = st.multiselect("处罚依据", lawlist)
                    law_select = st.text_input("处罚依据")
                # search button
                searchbutton = st.form_submit_button("搜索")

            if searchbutton:
                # if text are all empty
                if title_text == "" and event_text == "" and wenhao_text == "":
                    st.warning("请输入搜索关键词")
                    # st.stop()
                # if industry == []:
                #     industry = industrylist
                # if law_select == []:
                #     law_select = lawlist
                # if province == []:
                #     province = provlist
                st.session_state["keywords_cbirc"] = [
                    start_date,
                    end_date,
                    title_text,
                    wenhao_text,
                    event_text,
                    industry,
                    min_penalty,
                    law_select,
                    province,
                ]
                # search by start_date, end_date, wenhao_text, people_text, event_text, law_text, penalty_text, org_text
                search_df = searchdtl(
                    dfl,
                    start_date,
                    end_date,
                    title_text,
                    wenhao_text,
                    event_text,
                    industry,
                    min_penalty,
                    law_select,
                    province,
                )
                # save search_df to session state
                st.session_state["search_result_cbirc"] = search_df
            else:
                search_df = st.session_state["search_result_cbirc"]

        if search_df is None:
            st.error("请先搜索")
            st.stop()

        if len(search_df) > 0:
            # display eventdetail
            display_eventdetail(search_df)
        else:
            st.warning("没有搜索结果")

    elif choice == "案例分类":
        options = st.sidebar.radio(
            "选项",
            [
                "生成待标签案例",
                # "处罚金额分析",
                # "案例批量分类",
                # "监管地区分析",
                # "当事人分析",
                # "文本分类",
                # "信息抽取",
            ],
        )

        if options == "生成待标签案例":
            # button for generate label text
            labeltext_button = st.button("生成待更新案例")
            if labeltext_button:
                update_cbirclabel()

        # elif options == "处罚金额分析":
        #     # upload file button
        #     upload_file = st.file_uploader("上传文件", type=["csv"])
        #     # if file not null
        #     if upload_file is None:
        #         st.error("请上传文件")
        #     else:
        #         # read csv file into pandas dataframe
        #         df = pd.read_csv(upload_file)
        #         # data sample
        #         st.markdown("数据样例")
        #         st.write(df.head())
        #         # get column name list
        #         col_list = df.columns.tolist()
        #         # choose id column
        #         idcol = st.selectbox("选择id字段", col_list)
        #         # choose content column
        #         contentcol = st.selectbox("选择内容字段", col_list)
        #         # button for penalty amount analysis
        #         amount_button = st.button("处罚金额分析")
        #         if amount_button:
        #             # get penalty amount analysis result
        #             try:
        #                 url = backendurl + "/amtanalysis"
        #                 # Convert dataframe to BytesIO object (for parsing as file into FastAPI later)
        #                 file_bytes_obj = io.BytesIO()
        #                 df.to_csv(
        #                     file_bytes_obj, index=False
        #                 )  # write to BytesIO buffer
        #                 file_bytes_obj.seek(0)  # Reset pointer to avoid EmptyDataError
        #                 payload = {
        #                     "idcol": idcol,
        #                     "contentcol": contentcol,
        #                     # "df_in": df.to_json(),
        #                 }
        #                 files = {"file": file_bytes_obj}
        #                 headers = {}
        #                 res = requests.post(
        #                     url,
        #                     headers=headers,
        #                     params=payload,
        #                     files=files,
        #                 )
        #                 st.success("处罚金额分析完成")
        #                 # get result
        #                 result = res.json()
        #                 # convert result to dataframe
        #                 result_df = pd.read_json(result)
        #                 # download result
        #                 st.download_button(
        #                     label="下载结果",
        #                     data=result_df.to_csv().encode("utf-8-sig"),
        #                     file_name="amtresult.csv",
        #                     mime="text/csv",
        #                 )

        #             except Exception as e:
        #                 st.error(e)
        #                 st.error("处罚金额分析失败")

        # elif options == "文本分类":
        #     # text are for text
        #     article_text = st.text_area("输入文本", value="")
        #     # text area for input label list
        #     labeltext = st.text_area("输入标签列表", value="")
        #     # radio button for choose multi label or single label
        #     multi_label = st.checkbox("是否多标签", value=False, key="multi_label")

        #     # button for generate label text
        #     classify_button = st.button("案例分类")
        #     if classify_button:
        #         if article_text == "" or labeltext == "":
        #             st.error("输入文本及标签列表")
        #         else:
        #             # convert to list
        #             labellist = literal_eval(labeltext)

        #             try:
        #                 url = backendurl + "/classify"
        #                 payload = {
        #                     "article": article_text,
        #                     "candidate_labels": labellist,
        #                     "multi_label": multi_label,
        #                 }
        #                 headers = {}
        #                 res = requests.post(url, headers=headers, params=payload)
        #                 st.success("案例分类完成")
        #                 st.write(res.json())
        #             except Exception as e:
        #                 st.error("案例分类失败")
        #                 st.write(e)

        # elif options == "案例批量分类":
        #     # upload file button
        #     upload_file = st.file_uploader("上传文件", type=["csv"])

        #     # text area for input label list
        #     labeltext = st.text_area("输入标签列表", value="")
        #     # radio button for choose multi label or single label
        #     multi_label = st.checkbox("是否多标签", value=False, key="multi_label")

        #     # if file not null
        #     if upload_file is None:
        #         st.error("请上传文件")
        #     else:
        #         # read csv file into pandas dataframe
        #         df = pd.read_csv(upload_file)
        #         # data sample
        #         st.markdown("数据样例")
        #         st.write(df.head())
        #         # get column name list
        #         col_list = df.columns.tolist()
        #         # choose id column
        #         idcol = st.selectbox("选择id字段", col_list)
        #         # choose content column
        #         contentcol = st.selectbox("选择内容字段", col_list)

        #         # button for generate label text
        #         classify_button = st.button("案例分类")
        #         if classify_button:
        #             if labeltext == "":
        #                 st.error("输入标签列表")
        #                 labellist = []
        #             else:
        #                 # convert to list
        #                 labellist = literal_eval(labeltext)

        #             try:
        #                 url = backendurl + "/batchclassify"
        #                 # Convert dataframe to BytesIO object (for parsing as file into FastAPI later)
        #                 file_bytes_obj = io.BytesIO()
        #                 df.to_csv(
        #                     file_bytes_obj, index=False
        #                 )  # write to BytesIO buffer
        #                 file_bytes_obj.seek(0)  # Reset pointer to avoid EmptyDataError
        #                 payload = {
        #                     "candidate_labels": labellist,
        #                     "multi_label": multi_label,
        #                     "idcol": idcol,
        #                     "contentcol": contentcol,
        #                     # "df_in": df.to_json(),
        #                 }
        #                 files = {"file": file_bytes_obj}
        #                 headers = {}
        #                 res = requests.post(
        #                     url,
        #                     headers=headers,
        #                     params=payload,
        #                     files={"file": file_bytes_obj},
        #                 )
        #                 st.success("案例分类完成")
        #                 # get result
        #                 result = res.json()
        #                 # convert result to dataframe
        #                 result_df = pd.read_json(result)
        #                 # download result
        #                 st.download_button(
        #                     label="下载结果",
        #                     data=result_df.to_csv().encode("utf-8-sig"),
        #                     file_name="labelresult.csv",
        #                     mime="text/csv",
        #                 )
        #             except Exception as e:
        #                 st.error("案例分类失败")
        #                 st.write(e)

        # elif options == "监管地区分析":
        #     # upload file button
        #     upload_file = st.file_uploader("上传文件", type=["csv"])
        #     # if file not null
        #     if upload_file is None:
        #         st.error("请上传文件")
        #     else:
        #         # read csv file into pandas dataframe
        #         df = pd.read_csv(upload_file)
        #         # data sample
        #         st.markdown("数据样例")
        #         st.write(df.head())
        #         # get column name list
        #         col_list = df.columns.tolist()
        #         # choose id column
        #         idcol = st.selectbox("选择id字段", col_list)
        #         # choose title column
        #         titlecol = st.selectbox("选择标题字段", col_list)
        #         # choose content column
        #         contentcol = st.selectbox("选择内容字段", col_list)
        #         # button for location analysis
        #         loc_button = st.button("监管地区分析")
        #         if loc_button:
        #             # get penalty amount analysis result
        #             try:
        #                 url = backendurl + "/locanalysis"
        #                 # Convert dataframe to BytesIO object (for parsing as file into FastAPI later)
        #                 file_bytes_obj = io.BytesIO()
        #                 df.to_csv(
        #                     file_bytes_obj, index=False
        #                 )  # write to BytesIO buffer
        #                 file_bytes_obj.seek(0)  # Reset pointer to avoid EmptyDataError
        #                 payload = {
        #                     "idcol": idcol,
        #                     "titlecol": titlecol,
        #                     "contentcol": contentcol,
        #                     # "df_in": df.to_json(),
        #                 }
        #                 files = {"file": file_bytes_obj}
        #                 headers = {}
        #                 res = requests.post(
        #                     url,
        #                     headers=headers,
        #                     params=payload,
        #                     files=files,
        #                 )
        #                 st.success("监管地区分析完成")
        #                 # get result
        #                 result = res.json()
        #                 # convert result to dataframe
        #                 result_df = pd.read_json(result)
        #                 # download result
        #                 st.download_button(
        #                     label="下载结果",
        #                     data=result_df.to_csv().encode("utf-8-sig"),
        #                     file_name="locresult.csv",
        #                     mime="text/csv",
        #                 )

        #             except Exception as e:
        #                 st.error(e)
        #                 st.error("处罚金额分析失败")

        # elif options == "当事人分析":
        #     # upload file button
        #     upload_file = st.file_uploader("上传文件", type=["csv"])
        #     # if file not null
        #     if upload_file is None:
        #         st.error("请上传文件")
        #     else:
        #         # read csv file into pandas dataframe
        #         df = pd.read_csv(upload_file)
        #         # data sample
        #         st.markdown("数据样例")
        #         st.write(df.head())
        #         # get column name list
        #         col_list = df.columns.tolist()
        #         # choose id column
        #         idcol = st.selectbox("选择id字段", col_list)
        #         # choose content column
        #         contentcol = st.selectbox("选择当事人字段", col_list)
        #         # button for location analysis
        #         people_button = st.button("当事人分析")
        #         if people_button:
        #             # get penalty amount analysis result
        #             try:
        #                 url = backendurl + "/peopleanalysis"
        #                 # Convert dataframe to BytesIO object (for parsing as file into FastAPI later)
        #                 file_bytes_obj = io.BytesIO()
        #                 df.to_csv(
        #                     file_bytes_obj, index=False
        #                 )  # write to BytesIO buffer
        #                 file_bytes_obj.seek(0)  # Reset pointer to avoid EmptyDataError
        #                 payload = {
        #                     "idcol": idcol,
        #                     "contentcol": contentcol,
        #                 }
        #                 files = {"file": file_bytes_obj}
        #                 headers = {}
        #                 res = requests.post(
        #                     url,
        #                     headers=headers,
        #                     params=payload,
        #                     files=files,
        #                 )
        #                 st.success("当事人分析完成")
        #                 # get result
        #                 result = res.json()
        #                 # convert result to dataframe
        #                 result_df = pd.read_json(result)
        #                 # download result
        #                 st.download_button(
        #                     label="下载结果",
        #                     data=result_df.to_csv().encode("utf-8-sig"),
        #                     file_name="peopleresult.csv",
        #                     mime="text/csv",
        #                 )

        #             except Exception as e:
        #                 st.error(e)
        #                 st.error("当事人分析失败")

        # elif options == "信息抽取":
        #     # text are for text
        #     article_text = st.text_area("输入文本", value="")
        #     # input topic
        #     topic = st.text_input("输入主题", value="")

        #     # button for information extraction
        #     extract_button = st.button("信息抽取")
        #     if extract_button:
        #         if article_text == "" or topic == "":
        #             st.error("输入文本及主题")
        #         else:
        #             try:
        #                 url = backendurl + "/infoextract"
        #                 payload = {
        #                     "article": article_text,
        #                     "topic": topic,
        #                 }
        #                 headers = {}
        #                 res = requests.post(url, headers=headers, params=payload)
        #                 st.success("信息抽取完成")
        #                 st.write(res.json())
        #             except Exception as e:
        #                 st.error("信息抽取失败")
        #                 st.write(e)

    elif choice == "案例下载":
        download_cbircsum(org_namels)

    elif choice == "案例上线":
        uplink_cbircsum()


if __name__ == "__main__":
    main()
