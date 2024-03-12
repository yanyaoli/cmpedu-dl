import requests
from bs4 import BeautifulSoup
import re

def get_all_resources(resource_divs):
    all_resources = []
    for resource in resource_divs:
        resource_title = resource.find("div", class_="gjzy_listRTit").text.strip()
        resource_id = resource.find("a")["href"].split("/")[-1].split(".")[0]
        download_url = f"http://www.cmpedu.com/ziyuans/d_ziyuan.df?id={resource_id}"
        all_resources.append((resource_id, resource_title, download_url))
    return all_resources

def main():
    while True:
        book_id = input("请输入BookID (输入 'exit' 退出程序): ")
        
        if book_id.lower() == 'exit':
            print("退出程序。")
            break

        url = f"http://www.cmpedu.com/ziyuans/index.htm?BOOK_ID={book_id}"

        try:
            response = requests.get(url)
            response.raise_for_status() 

            soup = BeautifulSoup(response.text, 'html.parser')

            resource_divs = soup.find_all("div", class_="row gjzy_list")

            if resource_divs:
                print(f"\n资源目录在线查看：{url} \n")

                all_resources = get_all_resources(resource_divs)

                headers = {
                    "Accept-Encoding": "gzip, deflate",
                    "Connection": "keep-alive",
                    "Accept": "text/html, */*; q=0.01",
                    "User-Agent": "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
                    "Accept-Language": "en-US,en;q=0.9",
                    "X-Requested-With": "XMLHttpRequest"
                }

                for resource_id, resource_title, download_url in all_resources:
                    response = requests.get(download_url, headers=headers)
                    if response.status_code == 200:
                        download_links = re.findall(r'window\.location\.href=\'(https?://[^\'"]+)\'', response.text)
                        if download_links:
                            download_link = download_links[0]
                            print(f"{resource_title}  下载链接: {download_link}")
                            # try:
                            #     import webbrowser
                            #     webbrowser.open(download_link)
                            # except Exception as e:
                            #     print(f"{resource_title} 打开下载链接失败: {e}")
                        else:
                            print(f"{resource_title} 下载链接未找到!")
                    else:
                        print(f"{resource_title} 下载请求失败! 状态码: {response.status_code}")

            else:
                print("没有找到资源信息。")

        except requests.exceptions.RequestException as e:
            print(f"发生请求错误: {e}")
        except Exception as e:
            print(f"发生错误: {e}")

if __name__ == "__main__":
    main()
