import requests

url = "https://www.amazon.com/Issues-History-Photography-Fashion-Magazines/dp/071487678X"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

try:
    r = requests.get(url, headers=headers, timeout=10)
    with open("amz_success.html", "w", encoding="utf-8") as f:
        f.write(r.text)
    print("Written HTML to amz_success.html")
except Exception as e:
    print(e)
