"""
検証環境ページのスクリーンショットを自動取得するスクリプト
"""
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from datetime import datetime
import os

def take_screenshot(url, output_path=None):
    """指定されたURLのスクリーンショットを取得"""
    if output_path is None:
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        output_path = f"verification-screenshot-{timestamp}.png"
    
    # Chromeオプション設定
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # ヘッドレスモード
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    
    try:
        # ChromeDriverを起動
        driver = webdriver.Chrome(options=chrome_options)
        
        print(f"ページを読み込んでいます: {url}")
        driver.get(url)
        
        # ページが完全に読み込まれるまで待機
        time.sleep(3)
        
        # スクリーンショットを取得
        print(f"スクリーンショットを取得しています...")
        driver.save_screenshot(output_path)
        
        print(f"✅ スクリーンショットを保存しました: {output_path}")
        
        driver.quit()
        return output_path
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        print("ChromeDriverがインストールされているか確認してください。")
        return None

if __name__ == "__main__":
    url = "https://fleapay-lite-t1.onrender.com"
    output_path = take_screenshot(url)
    
    if output_path:
        print(f"\nスクリーンショットファイル: {output_path}")
        print(f"ファイルサイズ: {os.path.getsize(output_path) / 1024:.2f} KB")

