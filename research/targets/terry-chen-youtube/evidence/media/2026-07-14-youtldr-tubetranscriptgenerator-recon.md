# YouTLDR And TubeTranscriptGenerator Recon

## Metadata

- Target: Terry Chen YouTube channel transcript recovery
- Artifact type: Online provider reconnaissance and collection note
- Generated: 2026-07-14
- Constraint: YouTube-link-based online provider extraction only. No local video/audio download and no local ASR.
- New collector scripts:
  - `scripts/collect_youtube_transcripts_youtldr.py`
  - `scripts/collect_youtube_transcripts_tubetranscriptgenerator.py`

## Summary

This pass found the first repeatable no-login provider path after AI Video Summarizer quota blocked the remaining hard cases. Follow-up bounded priority runs confirmed that YouTLDR can also recover additional Tier 2 videos and that some provider-side HTTP 403 failures are retryable.

| Provider | Route | Result | Routing decision |
| --- | --- | --- | --- |
| YouTLDR | `POST https://you-tldr.com/api/ingestions`, then poll `/api/ingestions/<runId>` with the returned bearer token | Q59 positive control succeeded. With language `zh`, YouTLDR returned 215 Terry hard-case / Tier 2 transcripts; 210 are provider-side `source: whisper`, and `ASXM4-CQG8o` / `-A0I6qZ5cZw` / `32lXkmZM8pQ` / `ofitybjcHz0` / `z6wMUaErCxU` have complete text but no source metadata. | Current best scripted hard-case unlocker after AI Video Summarizer. Use bounded priority batches and cross-check later. |
| TubeTranscriptGenerator | Supabase Edge Function `fetch-transcript` with the site `Origin` / `Referer` and anon key from the public app bundle | Q59 positive control succeeded, but hard cases returned `No captions available for this video. The video may not have subtitles enabled.` | Direct-caption cross-check provider only. |
| YouTLDR wrong-language probe | Same ingestion route with `language: zh-TW` | `AFB5JNjXjsE` reached provider-side Whisper fallback but failed because `zh-tw` is not a valid Whisper language code. | Use `zh`, not `zh-TW`, for Chinese hard-case ingestion. |

## YouTLDR Collection Results

YouTLDR added 215 useful raw transcripts without local media download. Provider metadata marks 210 of them as `whisper`; `ASXM4-CQG8o`, `-A0I6qZ5cZw`, `32lXkmZM8pQ`, `ofitybjcHz0`, and `z6wMUaErCxU` have complete text but no source metadata.

| Video id | Title | Provider source | Status |
| --- | --- | --- | --- |
| `AFB5JNjXjsE` | 如何保護你的長期投資倉位？ | `whisper` | ok |
| `bsN8REhmr6M` | 沒人講的比特幣風險，你確定要投資？ | `whisper` | ok |
| `5lXsYdh4sgI` | 揭秘投資鏈最頂層玩家：風險創投 | `whisper` | ok |
| `kXVlrSjSPUE` | 投資特斯拉的致命風險 | `whisper` | ok |
| `VLsbfzuuk6Q` | 10分鐘了解BNB：最硬的山寨幣 | `whisper` | ok |
| `aS7F9IjYqGM` | 投資美股零手續費券商：Firstrade完整教學 | `whisper` | ok |
| `mkRNzJ5iasA` | 投資美股怎麼選？（非業配） | `whisper` | ok |
| `TXhmc6ryMIg` | 目前市場都在最高點，要怎麼投資？feat. 總經分析師 @kukantieh | `whisper` | ok |
| `S3wi54arf04` | 我的虛擬貨幣投資心法 | `whisper` | ok |
| `5TDTxHZXiLE` | 為什麼投資比特幣 | `whisper` | ok |
| `_9Vjc25BaW4` | 怎麼看最近市場的震盪？ | `whisper` | ok |
| `diU75OZiuX8` | 完全免費的美股投資研究神器 #moomoo | `whisper` | ok after retry |
| `nOj2qKzsgLY` | 90%的人都忽視的面試關鍵準備：Behavioral Interview 行為面試 | `whisper` | ok |
| `-dRVpWPFBCg` | 區塊鏈女神來了：如何從空姐到華語幣圈No.1創作者 | `whisper` | ok |
| `tk7WzzZ3CCQ` | Facebook、Uber早期員工股票幾乎沒賣！矽谷大神完整心法公開 | `whisper` | ok |
| `E17LUN8uzzQ` | 我的加密貨幣持倉 | `whisper` | ok |
| `BgfTSZXNUa0` | 投資特斯拉消逝的四年 | `whisper` | ok |
| `P1SqFI4RMrY` | 我的加密貨幣持倉 | `whisper` | ok |
| `WL47wW4ail8` | 不要投資特斯拉 | `whisper` | ok |
| `e0CJBzGa0hQ` | 對 AI 泡沫怎麼看？ | `whisper` | ok after retry |
| `1PEjeshVbZw` | 不會日文也能投資日本房地產？這家公司幫海外投資人解決所有問題 | `whisper` | ok after retry |
| `CfM7JHJWe58` | 怎麼用台幣買比特幣？最完整教學，3分鐘搞定！ | `whisper` | ok |
| `8OjJp5jJQOs` | 幣圈上班真的比傳統金融賺更多嗎？ | `whisper` | ok |
| `euRySEUNwy4` | 主流媒體是怎麼毀掉你的投資 | `whisper` | ok |
| `7jMD0AKhW10` | 幣圈交易員分享成功秘笈，從十萬到千萬 | `whisper` | ok |
| `pbzs6A-topY` | 從ALL IN比特幣的工程師到華人首富 | `whisper` | ok |
| `Pw4rPF0Gh_0` | 魯蛇工程師開箱西雅圖五億台幣豪宅 | `whisper` | ok |
| `HApApK3G6MA` | 矽谷剛畢業工程師收入？開銷？@kellytsaii | `whisper` | ok |
| `l-GLv-a9Pco` | 我問AI機器人面試的題目｜ChatGPT | `whisper` | ok |
| `lr57dn0-Zmk` | 【隨便年薪千萬台幣?】揭秘加州軟體工程師每一個級別的薪水細節 | `whisper` | ok |
| `IAq64jL6228` | 開箱我花5萬美金裝潢的Airbnb | `whisper` | ok |
| `0xKLVJuBRCU` | 如何準備行為面試｜BQ Interview Prep | `whisper` | ok |
| `tog6Ue7He9Q` | 美股/加密貨幣 全都暴跌 | `whisper` | ok |
| `qefEi0grWeA` | Anchor被動收入教學｜回答大家問題 | `whisper` | ok |
| `A6TW2Oc4j7Q` | 為什麼我要面試｜你的職場護城河？ | `whisper` | ok |
| `xS5Lv7-bMYI` | 不僅僅是編程｜如何成為成功的工程師 | `whisper` | ok |
| `OjaK7nmCYCo` | 如何談薪水Like A Pro | `whisper` | ok |
| `zomYKjlvJGU` | 系統設計面試6個技巧｜我面Google前的準備方法 | `whisper` | ok |
| `Z4n70osikaw` | 為什麼比特幣沒有任何競爭對手？ | `whisper` | ok |
| `9sliXt8Zs-Y` | 加密貨幣完整出入金教學 | `whisper` | ok |
| `2JjXdva3mWU` | 以太幣還有救嗎？為什麼上市公司開始囤以太？ | `whisper` | ok |
| `Bm4qkzrl-Hg` | 幣圈極度貪婪，進出場時機要怎麼把握？ft.@murmurcats_official | `whisper` | ok |
| `9QRA-rCUA5U` | 為什麼分配5%的資產在加密貨幣 | `whisper` | ok |
| `CxeDMF2jF9E` | 美國房地產為什麼沒有崩塌？ | `whisper` | ok |
| `mDpxLytPUKg` | 2026年一口氣搞懂 網格策略 | `whisper` | ok |
| `295d-r85l_I` | 加密貨幣發生了什麼事？ | `whisper` | ok |
| `iOCR2iKXhOs` | 你真的了解風險嗎？ | `whisper` | ok |
| `MvdK9at7GHE` | 從零開始了解比特幣：所有你需要知道的基礎 | `whisper` | ok |
| `FOry3r6yuDg` | 加密貨幣冷錢包教學 | `whisper` | ok |
| `CNsXroT21dU` | 為什麼我重倉特斯拉 | `whisper` | ok |
| `_g4HRf-vwIg` | Crypto.com卡大更新，還值得辦嗎？ | `whisper` | ok |
| `zWt8DOYJiTE` | 比亞迪真的遙遙領先特斯拉？ | `whisper` | ok |
| `0CV8JlhHSA4` | 投資可以照抄作業嗎？ | `whisper` | ok |
| `0JpAC7XvdYY` | 從黃金價格漲跌看當前投資交易策略 ft. DecodeEX首席策略分析師 | `whisper` | ok |
| `ht3VXIYQIqU` | 我到底在投資三小 | `whisper` | ok |
| `3NzmDiMEYP8` | 你現在買的車，兩年後可能歸零。 | `whisper` | ok |
| `nCticKfLCj8` | 我定義的成功是什麼？ | `whisper` | ok |
| `Y-9KCih1zOA` | 揭開能讓你賺錢的商業思維 ft. 汪志謙老師 | `whisper` | ok |
| `V8-s0FE3nF4` | 特斯拉員工對股票暴跌的反應？工作8個月像過了3年。 | `whisper` | ok |
| `pLfpDHfKHHs` | 當個有錢的工程師｜掌握未來趨勢 | `whisper` | ok |
| `SvOV80Rlpqk` | 複製交易能賺錢嗎？ | `whisper` | ok |
| `KVhL2RqVtiM` | 為什麼你不快樂 | `whisper` | ok |
| `Py1UFAAmCc4` | 中國跟美國工程師的面試流程，薪資區別 | `whisper` | ok |
| `f-OOnm7pv_s` | 學霸公開矽谷水果公司非工程師薪水 @JerrySaysCheese | `whisper` | ok |
| `-AvpXoF6O3U` | 矽谷資深產品經理收入公開 ft.@chloeshih | `whisper` | ok |
| `A8GWS00nYDQ` | 數據科學家薪水｜美國，中國，台灣統一？ | `whisper` | ok |
| `xMUjQKn13PA` | 成為Top 1%工程師 | `whisper` | ok |
| `94Yu6n_Hw58` | 比特幣為什麼現在買 | `whisper` | ok |
| `QuLOU6uYKyI` | 2023年經濟衰退該怎麼投資？ | `whisper` | ok |
| `feJf1if-r1M` | 如何勝任初級軟體工程師 | `whisper` | ok |
| `BkszA-MvjXA` | 誠徵資深實習生｜面試過程公開 | `whisper` | ok |
| `9gqqCkWaP50` | 我的100萬美金年薪公開 | `whisper` | ok |
| `02_xHMc_lBg` | Google台灣人資長來了 ｜就是要聊薪水 | `whisper` | ok |
| `rC-vbPLmx-8` | Google台灣軟體工程師來了 ｜就是要聊薪水 | `whisper` | ok |
| `ASXM4-CQG8o` | How to tech interview Like a Pro | not declared | ok |
| `Q3hEnlIHhoY` | 現在轉行工程師會太老嗎？ | `whisper` | ok |
| `vJcMEojoGxY` | 【轉行軟體工程師】我自己從非專業背景轉型成為軟體工程師的心路歷程｜經驗分享 | `whisper` | ok |
| `uFzesIxJA_E` | $100美元就能在台灣收房租？ | `whisper` | ok |
| `_5BTnJElgt8` | 特斯拉史上最差的財報，股價卻漲30%？ | `whisper` | ok |
| `Kn82i27buV4` | 比特幣重回9萬，接下來呢？ | `whisper` | ok |
| `uHyDQHlpXM8` | 什麼是幣圈『擼羊毛』？真的有這麼多送錢機會嗎 | `whisper` | ok |
| `Id3-EiuDRw8` | 川普豪賭比特幣，美國即將創造更多百萬富翁？ | `whisper` | ok |
| `PZTcQgUAGls` | 中國的AI要把美國卷死了嗎？ | `whisper` | ok |
| `MvdwRa5nNO4` | Nvidia會重演Cisco的歷史嗎？ | `whisper` | ok |
| `6gjoMD3qDq8` | 所以降息股票是漲還是跌？ | `whisper` | ok |
| `dmjCg7cGlW8` | 趴懶要噴射了｜Palantir有多猛 | `whisper` | ok |
| `nUvHiUaEIOw` | 房地產什麼時候崩盤？ | `whisper` | ok |
| `g6jbYUdj36Y` | USDT穩定幣會倒閉嗎？ | `whisper` | ok |
| `MWXffsMmz-o` | 特斯拉裁員500人超級充電團隊的真正原因 | `whisper` | ok |
| `GfcrfcJpGbw` | 美國要開始屯幣了？ | `whisper` | ok |
| `eiqrVenTXD4` | 我們需要聊一下特斯拉 | `whisper` | ok |
| `SrtvkPL15R0` | 我所有的股票 | `whisper` | ok |
| `W5ZWlX1LxEk` | 2024年的比特幣 | `whisper` | ok |
| `epaBq0UIPLk` | 公開我的加密貨幣虧損 | `whisper` | ok |
| `4XLE6C6R7dc` | 5年前的老特斯拉 Model 3 電池損耗跟自動駕駛？ | `whisper` | ok |
| `1-IwQm9ybsA` | 特斯拉影響報告：這個世界還有救 | `whisper` | ok |
| `YESQyP49-Mg` | 投資AI人工智慧5間最有潛力公司 | `whisper` | ok |
| `PgZI0k-_j_k` | 如何從文科學霸轉職成軟體工程師 ​@aliceinsiliconwonderland | `whisper` | ok |
| `YWYDnDoHblc` | 一個人旅行，最自由｜大阪 vlog | `whisper` | ok |
| `PvzgMhM7bK8` | 我們需要聊一下特斯拉 | `whisper` | ok |
| `NZlhYG1YIas` | 我天使投資了一家公司 | `whisper` | ok |
| `Bo4_nVFpVps` | 2021年投資回顧｜未來看法 | `whisper` | ok |
| `zFeCVunJOoY` | 美國危機期：富人更富、窮人更窮 | `whisper` | ok after retry |
| `JH8SoCsf35g` | 美股暴跌，我該止損嗎？ | `whisper` | ok after retry |
| `OFQbCl8mLoo` | 特斯拉什麼時候破產？ | `whisper` | ok after retry |
| `hkw0_YSeaRU` | MicroStrategy是無限資金外掛還是下一個幣圈災難？ | `whisper` | ok after retry |
| `Ska2dPEu7EA` | 年薪70萬美金是矽谷貧困線？ | `whisper` | ok after retry |
| `4ZFMZUTfi4M` | 公開我被裁員前的年薪 | `whisper` | ok after retry |
| `uASW46AWEwo` | 工程師幕後週末的一天 | `whisper` | ok after retry |
| `Awuhw2y1AgY` | 工程師在山上工作的一天 | `whisper` | ok |
| `_CjLipqZgUU` | WFH工程師一整天開銷Vlog | `whisper` | ok |
| `MsbzY6QbRVA` | 讓我拿到FAANG面試的履歷 | `whisper` | ok |
| `7DTs5W4Zmuo` | 北美工程師週末耍廢Vlog ｜流下男人珍貴的眼淚 | `whisper` | ok |
| `axpmhUKyixg` | 【早餐很重要】工程師早上吃什麼 | `whisper` | ok |
| `_i2febc-9jY` | 自動駕駛終極對決：Tesla vs Waymo | `whisper` | ok after retry |
| `lgVir_IqQ28` | 特斯拉暴跌63%還有救嗎 | `whisper` | ok after retry |
| `k4K1uNM4S_k` | 特斯拉估值過高？ | `whisper` | ok |
| `YKcagGAZRz0` | AI科學家薪資公開｜16萬美金簽字費 | `whisper` | ok |
| `7A54_5MVH-8` | 我買了一個房子 | `whisper` | ok |
| `DtoLuOysaqQ` | 比特幣年底11萬美金？ | `whisper` | ok |
| `DkirUmf4Asw` | 特斯拉$1200還能買嗎 | `whisper` | ok |
| `dT_9yuPYems` | 通過GME事件看區塊鏈的崛起｜華爾街vs鄉民 | `whisper` | ok |
| `g9UHIIYBOdE` | Bybit危機成轉機？OKX Wallet 自我審查竟是為了這場未爆彈？ | `whisper` | ok after retry |
| `ckwDcHE_QJY` | 世紀失敗品：氫能源車 | `whisper` | ok |
| `Dgjic4BbjGs` | 我要被AI取代了嗎？ | `whisper` | ok after retry |
| `bpx08OOZmeQ` | 加密貨幣骨牌大崩塌 | `whisper` | ok after retry |
| `cULgfb_v4GE` | 北美工程師在家工作的一天｜我自己的真實版 | `whisper` | ok after retry |
| `z6RnHqSuqUo` | 【被軟體工程師耽誤的歌手】雷射手術3年後 術後心得經驗分享 | `whisper` | ok after retry |
| `03PrnQPmi6o` | 以太準備要噴射了 | `whisper` | ok |
| `Ea_eEXei4c8` | 遇到有毒工作環境怎麼辦？ | `whisper` | ok |
| `at7uItPdu7s` | 怎麼樣成為產品經理？ft.矽谷阿雅 | `whisper` | ok |
| `-A0I6qZ5cZw` | 內向的人怎麼練英語 @CamblyGlobal | not declared | ok |
| `Ng14_K-W6wQ` | 為什麼電力會免費 | `whisper` | ok |
| `gnDxkZJxs4A` | 如何累積職場信譽 | `whisper` | ok |
| `sFWfC72WWQY` | 【科技公司Offer拿到手軟】軟體工程師在北美找工作/跳槽的終極武器 ｜刷題是什麼？ | `whisper` | ok after retry |
| `51dNGqLoM00` | 專業開箱 土耳其航空 商務艙✈️ | `whisper` | ok |
| `vkIh4XPu1EE` | 去了一趟 Vegas，我又再次愛上了寫程式 | `whisper` | ok |
| `R7zAMgiawks` | 我在越南每天要花多少錢？ | `whisper` | ok |
| `m7iFNwj_bDQ` | 開箱F1 Paddock Club，30萬的門票到底值不值？ | `whisper` | ok |
| `KF3fPgSQx8E` | 我要去一個很神奇的國家 | `whisper` | ok |
| `uaEm4XRSAAc` | 我來Google東京辦公室蹭飯了 | `whisper` | ok |
| `sDGc4fK7O_U` | 如何成為時間管理大師 | `whisper` | ok |
| `GoDzWt6ESh8` | 為什麼你不需要蘋果M2 Max | `whisper` | ok |
| `B0kUs1tZWUo` | 來加拿大讀書怎麼選？ | `whisper` | ok |
| `BQ_mYbm6C9I` | 北美科技業大公司小公司怎麼選？ | `whisper` | ok |
| `YAg2OTiFHBE` | 怎麼加強英文口說｜經驗分享 | `whisper` | ok |
| `T5DzIzHwJvk` | 50萬訂閱Q&A | `whisper` | ok |
| `zZGFt6K3kaY` | 專業開箱星宇航空頭等艙（西雅圖✈️台北） | `whisper` | ok |
| `plpyrtLavn4` | 美國是最偉大的國家，沒有之一 | `whisper` | ok |
| `btBFmKxSoe0` | Web3.0時代你一定要知道的熱錢包 | `whisper` | ok |
| `lQ7cV2jkWZQ` | 美國選舉對黃金價格的影響 | `whisper` | ok |
| `B0AT2OZcy6Q` | 我騙了大家 | `whisper` | ok |
| `wduqrFdcZX4` | 中國迎來新牛市？還是一波新災難？ | `whisper` | ok |
| `6gp8-XENKqk` | 黃金能對抗通脹嗎？ | `whisper` | ok |
| `UbR6eD-1EHU` | 5個我每天都離不開的App | `whisper` | ok |
| `ixG4OLDnHzM` | 邊工作邊找穿韓服的妹子 | `whisper` | ok |
| `JoKtRXg89bk` | 我辭職了 | `whisper` | ok |
| `g4uA-hK_ouY` | 我把Cybertruck當垃圾車 | `whisper` | ok |
| `2gxNM-5HaYA` | Alpha Picks值不值得訂閱？ | `whisper` | ok |
| `_kpyMxtTMCk` | 美國有比台灣生活品質更好？ | `whisper` | ok |
| `d5vU_IcnLQY` | 40萬訂閱真心話大冒險 Part 2 | `whisper` | ok |
| `LrjIsA0qnrE` | 40萬訂閱真心話大冒險 Part 1 | `whisper` | ok |
| `-juM640BPnw` | 可能美國更適合你 | `whisper` | ok |
| `OAjivEnWHcA` | 我的Turo生意收攤了 | `whisper` | ok |
| `p7FqJm0qyEM` | 你確定要來美國？ | `whisper` | ok |
| `eO-XgTedlsQ` | Gate.io IEO Startup 空投 | `whisper` | ok |
| `Xy1VVfbBBLU` | 自動駕駛終於有希望了 | `whisper` | ok |
| `yp-Wp4nIWp0` | 終於拿到賠償，但是虧損繼續 | `whisper` | ok |
| `235KLJfaPlQ` | 連我媽都會用的自動交易機器人 | `whisper` | ok |
| `YoS3MZVa6Cc` | CFD差價合約：讓資本放大的雙刃劍 | `whisper` | ok |
| `hWb2_NEPebI` | 我用ChatGPT幫我自動交易 | `whisper` | ok |
| `FyUKux68iag` | 公開我的Youtube所有運營成本 | `whisper` | ok |
| `e5n6XXhEK4U` | 我被裁員了 | `whisper` | ok |
| `lAoXCHSCVT0` | 我每個月花$0供美國百萬新家 | `whisper` | ok |
| `ZKqWsYqqClg` | 美元的末日？通膨才正開始 | `whisper` | ok |
| `aGowhfZFpFI` | 矽谷銀行SVB倒閉的真相 | `whisper` | ok |
| `ixmEqAsYUas` | 1929年大蕭條即將重演？ | `whisper` | ok |
| `3oyROW1YKdY` | 經濟崩塌就在眼前 | `whisper` | ok |
| `QJhG_17DpRU` | 經濟衰退要來了？ | `whisper` | ok |
| `ygL6OOOdwqM` | 西雅圖家裡淹水的天價維修帳單 | `whisper` | ok |
| `HN7f1thlGso` | 30萬訂閱Q&A | `whisper` | ok |
| `wSc3nGM8GOY` | 關於我被裁員那集影片... | `whisper` | ok |
| `2m_FB0hCdmk` | 開箱我在西雅圖的百萬新家 | `whisper` | ok |
| `Pp78kf_6d3g` | 我30歲了還沒有車 | `whisper` | ok |
| `k3Gh_5JrFa4` | 回顧2022 | `whisper` | ok |
| `ZxEkw_OWvxA` | 20萬訂閱Q&A | `whisper` | ok |
| `si_Cfyj2nCg` | 科技業必備職場心理素質 | `whisper` | ok |
| `i4xNoRa20Qc` | DeFi vs CeFi | `whisper` | ok |
| `G2w_6egpDvM` | Terra復活計畫 | `whisper` | ok |
| `LOZLE0oJWtY` | LUNA UST 崩塌｜真相 | `whisper` | ok |
| `lwsFycElqrs` | 我借了50萬美金 | `whisper` | ok |
| `32lXkmZM8pQ` | 西雅圖最危險最黑暗的角落 | not declared | ok |
| `fcdUBUnfCA4` | 我的身體越來越糟糕了 | `whisper` | ok |
| `Rde7K2lf1RE` | 我買了一台車 | `whisper` | ok |
| `Cm23CquLasU` | 公開詐騙廠商業配價碼 | `whisper` | ok |
| `lnxs2Kup3sQ` | 泰瑞對戰交易員 | `whisper` | ok |
| `ufoK9DxJt3o` | 吸雅圖@ChenLily | `whisper` | ok |
| `ofitybjcHz0` | 矽谷大神來了｜Part2 | not declared | ok |
| `z6wMUaErCxU` | 矽谷大神來了｜Part1 | not declared | ok |
| `7gdjRNSCtoI` | 出國留學要花多少錢？ft. @ChenLily | `whisper` | ok |
| `qnp7KaEimo4` | 優化你的人生｜我去Florida了 | `whisper` | ok |
| `GbuwJ7FcmaU` | 10萬訂閱Q&A | `whisper` | ok |
| `V4Ww3l9YFSo` | 我搬到西雅圖了｜回答網友美國工簽問題 | `whisper` | ok |
| `1SyDth2hDpE` | 我打完疫苗了 | `whisper` | ok |
| `69BxQJmnaSU` | 我的居家辦公室 | `whisper` | ok |
| `x9sM5rI3tW8` | 我花將近$0讀完加拿大大學｜國際學生留學經驗 | `whisper` | ok |
| `3EkaxkNGXD8` | 最適合學的第一個程式語言是哪個(在2021年) | `whisper` | ok |
| `cMGT5XXAEWw` | 【Travel Vlog】墨西哥 猶加敦半島 自駕遊 | `whisper` | ok |
| `44-lmGgGzv8` | 我在東京每天要花多少錢？ | `whisper` | ok after retry |
| `XB89ywDAzh0` | 2025全球最吸金手遊，竟然是？ | `whisper` | ok after retry |
| `EanJhw8oYzk` | 我搬到日本了 | `whisper` | ok after retry |
| `NhiosK0JSKU` | 我人生第一桶$100萬美金 | `whisper` | ok after retry |
| `f7jJU6qoxe8` | 為什麼我是ISTJ：最可靠的人格 | `whisper` | ok after retry |
| `pSoDUFdqVOU` | 2022最適合學的程式語言 | `whisper` | ok after retry |
| `klErNfEgW6E` | 來美國留學怎麼選？ | `whisper` | ok after retry |

The current Tier 1 manual/provider queue is empty. The latest Tier 2 / Tier 3 / Tier 4 probes completed but did not return text:

- `sK-IzrpapTo`: provider reports the video is members-only
- `e32UtIo0C3c`: provider returned no usable transcript text
- `erlOBf7auSE`: provider returned no usable transcript text
- `xeEd1DEizNE`: provider returned no usable transcript text
- `IXrpfHPqYfg`: provider returned no usable transcript text
- `9Ecx6g8ez1k`: provider reports members-only content
- `DcXyt4C-07E`: provider reports members-only content
- `FusQOi4BGYw`: provider reports members-only content
- `rIupufjIp5M`: provider reports the video is members-only
- `c24laHz3Vmo`: provider returned no usable transcript text

These failures are provider-side video acquisition errors, not local `yt-dlp` use by this archive.
Earlier rows for ids that later succeeded included the provider-side raw message `yt-dlp: ERROR: unable to download video data: HTTP Error 403: Forbidden`, which is why bounded retries remain useful even when blind looping is not.

## Archive Impact

- Useful transcript coverage increased from 65 to 282 videos after the later final-fallback online-provider retry, then to 285 videos after TubeTranscript.com Pro AI recovered `erlOBf7auSE`, `xeEd1DEizNE`, and `e32UtIo0C3c`, and finally to 286 videos after NoteGPT captured newest public video `JzIfrGMeAFw`.
- Fallback queue decreased from 225 to 8 videos after the later final-fallback online-provider retry, then to 5 videos after the TubeTranscript.com Pro AI changed-state recovery.
- Current machine-check phrases: 286 useful transcript captures; 5 fallback videos.
- Scored transcript gaps decreased from 157 to 7.
- Current Tier 1 manual/provider queue decreased to 0 videos.
- Canonical transcript signal lines increased to 6,456.
- Structured evidence ledger increased to 12,152 entries.
- Publish dates are now available for 284 of 286 ok transcript-covered videos; `xeEd1DEizNE` was added by metadata probe, while `erlOBf7auSE` and `e32UtIo0C3c` still lack exact publish dates.

## Practical Rule

Use YouTLDR as the next bounded hard-case provider before returning to manual/authenticated export routes. Keep it clearly labeled as provider-side cloud transcription evidence and cross-check when another provider unlocks the same video. Use TubeTranscriptGenerator only for direct-caption validation because it did not unlock no-caption Terry hard cases.
