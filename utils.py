from st_aggrid import AgGrid
from st_aggrid.grid_options_builder import GridOptionsBuilder
from st_aggrid.shared import GridUpdateMode
from textrank4zh import TextRank4Sentence


# get summary of text
def get_summary(text):
    tr4s = TextRank4Sentence()
    tr4s.analyze(text=text, lower=True, source="all_filters")

    sumls = []
    for item in tr4s.get_key_sentences(num=3):
        sumls.append(item.sentence)
    summary = "".join(sumls)
    return summary


def df2aggrid(df):
    gb = GridOptionsBuilder.from_dataframe(df)
    gb.configure_pagination()
    # gb.configure_side_bar()
    # gb.configure_auto_height()
    gb.configure_default_column(
        groupable=True,
        # value=True,
        # resizable=True,
        # wrap_text=True,
        # enableRowGroup=True,
        # aggFunc="sum",
        editable=True,
    )
    gb.configure_selection(selection_mode="single", use_checkbox=True)
    gridOptions = gb.build()
    ag_grid = AgGrid(
        df,
        theme="material",
        #  height=800,
        fit_columns_on_grid_load=True,  # fit columns to grid width
        gridOptions=gridOptions,  # grid options
        #  key='select_grid', # key is used to identify the grid
        update_mode=GridUpdateMode.SELECTION_CHANGED,
        #  update_mode=GridUpdateMode.NO_UPDATE,
        #  enable_enterprise_modules=True
    )
    return ag_grid


# split string by space into words, add brackets before and after words, combine into text
def split_words(text):
    words = text.split()
    words = ["(?=.*" + word + ")" for word in words]
    new = "".join(words)
    return new
