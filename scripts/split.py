import pandas as pd

import requests


def send_input_to_api(api_key, input_text):
    # Define the URL and headers for the API request
    url = "https://api.dify.ai/v1/workflows/run"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    # Prepare the data payload for the API request
    data = {
        "inputs": {"input_text": input_text},
        "response_mode": "blocking",
        "user": "cbirc-split",
    }

    # Send the API request and handle the response
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        response_json = response.json()
        return response_json.get("data", {}).get("outputs", {})
    else:
        response.raise_for_status()


def process_df(df, api_key, api_key2):
    results = []

    for index, row in df.iterrows():
        print("start: " + str(index))
        id = row["id"]
        print("id: " + str(id))
        input_text = row["内容"]
        print("input: " + str(input_text))

        try:
            output = send_input_to_api(api_key, input_text)
            print("output: " + str(output))
            output["id"] = id
            results.append(output)
        except Exception as e:
            print(f"An error occurred: {e}")
            try:
                output = send_input_to_api(api_key2, input_text)
                print("output (secondary key): " + str(output))
                output["id"] = id
                results.append(output)
            except Exception as e2:
                print(f"Failed with both keys: {e2}")

        if (index + 1) % 2 == 0:
            print("savefile: " + str(index))
            results_df = pd.DataFrame(results)
            savefileloc = "tempsplit" + str(index) + ".csv"
            results_df.to_csv(savefileloc)

    return results


if __name__ == "__main__":
    # api_key = "your_api_key"
    api_key = "app-"  # split
    api_key2 = "app-"  # split

    df = pd.read_csv("~/Downloads/cbirc_split20240629.csv")
    df2 = df[["id", "内容"]]

    results = process_df(df2, api_key, api_key2)
    results_df = pd.DataFrame(results)
    results_df.to_csv("cbirc_split20240629_output.csv")
