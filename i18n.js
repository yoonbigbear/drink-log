// 다국어(한국어·日本語·English).
// 화면 코드는 한국어로만 쓰여 있고, 이 파일이 화면에 그려진 글자를 사전으로 바꿔 준다.
// 줄 형식:  한국어 | 日本語 | English      ({0}, {1} 은 바뀌는 값 자리)
(function () {
  const SUP = ["ko", "ja", "en"];
  let saved = null; try { saved = localStorage.getItem("nomi_lang"); } catch (e) {}
  const nav = (navigator.language || "ko").slice(0, 2).toLowerCase();
  const lang = SUP.includes(saved) ? saved : SUP.includes(nav) ? nav : "en";
  window.LANG = lang; window.LOCALE = { ko: "ko-KR", ja: "ja-JP", en: "en-US" }[lang];
  window.setLang = v => { try { localStorage.setItem("nomi_lang", v); } catch (e) {} location.reload(); };
  window.TR = s => s;
  document.documentElement.lang = lang;
  if (lang === "ko") return;

  const RAW = `
전체 | すべて | All
취소 | キャンセル | Cancel
확인 | OK | OK
저장 | 保存 | Save
삭제 | 削除 | Delete
추가 | 追加 | Add
등록 | 送信 | Post
검색 | 検索 | Search
다음 | 次へ | Next
돌아가기 | 戻る | Back
‹ 닫기 | ‹ 閉じる | ‹ Close
지우기 | クリア | Clear
새 기록 | 新しい記録 | New entry
불러오는 중… | 読み込み中… | Loading…
처리 중… | 処理中… | Working…
저장 중… | 保存中… | Saving…
검색 중… | 検索中… | Searching…
확인 중… | 確認中… | Checking…
방금 | たった今 | just now
잔 | 杯 | pour
병 | 瓶 | bottle
보틀 | ボトル | bottle (bar)
캔 | 缶 | can
글라스 | グラス | glass
플라이트 | フライト | flight
주전자 | やかん | kettle
기타 | その他 | Other
권한이 없어요. Firestore 규칙을 게시했는지 확인해 주세요. | 権限がありません。Firestoreのルールが公開されているか確認してください。 | No permission. Check that the Firestore rules are published.
색인이 필요해요. | インデックスが必要です。 | An index is needed.
여기를 눌러 만들고 | ここを押して作成し | Tap here to create it,
몇 분 뒤 새로고침하세요. | 数分後に更新してください。 | then refresh in a few minutes.
색인이 필요해요. README의 색인 설정을 확인해 주세요. | インデックスが必要です。READMEのインデックス設定を確認してください。 | An index is needed. See the index setup in the README.
오늘 무료 사용량을 모두 썼어요. 내일 다시 시도해 주세요. | 今日の無料枠を使い切りました。明日もう一度お試しください。 | Today's free quota is used up. Please try again tomorrow.
서버에 연결할 수 없어요. | サーバーに接続できません。 | Can't reach the server.
오류 | エラー | Error
알 수 없음 | 不明 | Unknown
로그인 실패: {0} | ログイン失敗: {0} | Sign-in failed: {0}
실패: {0} | 失敗: {0} | Failed: {0}
검색 실패: {0} | 検索失敗: {0} | Search failed: {0}
저장 실패: {0} | 保存失敗: {0} | Couldn't save: {0}
삭제 실패: {0} | 削除失敗: {0} | Couldn't delete: {0}
보내지 못했어요: {0} | 送信できませんでした: {0} | Couldn't send: {0}
불러오지 못했어요: {0} | 読み込めませんでした: {0} | Couldn't load: {0}
이메일 형식이 올바르지 않아요 | メールアドレスの形式が正しくありません | That email address doesn't look right
비밀번호를 입력해 주세요 | パスワードを入力してください | Enter your password
비밀번호는 6자 이상이어야 해요 | パスワードは6文字以上にしてください | Password must be at least 6 characters
이미 가입된 이메일이에요. 로그인해 보세요 | 登録済みのメールアドレスです。ログインしてみてください | That email is already registered. Try signing in
아이디 또는 비밀번호가 맞지 않아요 | IDまたはパスワードが違います | Wrong ID or password
시도가 너무 많아요. 잠시 후 다시 해 주세요 | 試行回数が多すぎます。しばらくしてからもう一度お試しください | Too many attempts. Try again in a moment
아이디 로그인이 아직 켜져 있지 않아요 (관리자: Firebase 콘솔에서 이메일/비밀번호를 켜 주세요) | IDログインがまだ有効になっていません(管理者: Firebaseコンソールでメール/パスワードを有効にしてください) | ID sign-in isn't enabled yet (admin: enable Email/Password in the Firebase console)
네트워크 연결을 확인해 주세요 | ネットワーク接続を確認してください | Check your network connection
아이디를 입력해 주세요 | IDを入力してください | Enter your ID
위에 아이디를 먼저 적어 주세요 | 先に上の欄にIDを入力してください | Enter your ID above first
복구용 이메일이 등록되지 않은 아이디예요. 관리자에게 문의해 주세요 | 復旧用メールが登録されていないIDです。管理者にお問い合わせください | This ID has no recovery email. Please contact the admin
{0} 로 재설정 메일을 보냈어요. 스팸함도 확인해 보세요 | {0} に再設定メールを送りました。迷惑メールフォルダも確認してください | Reset email sent to {0}. Check your spam folder too
아이디로 가입 | IDで登録 | Sign up with ID
아이디와 비밀번호를 정해 주세요. | IDとパスワードを決めてください。 | Choose an ID and a password.
다음 단계에서 닉네임과 추천인을 적어요. | 次のステップでニックネームと紹介者を入力します。 | You'll enter a nickname and a referrer next.
아이디 (영문 소문자·숫자·_ , 3~20자) | ID(英小文字・数字・_ 、3〜20文字) | ID (lowercase letters, digits, _ ; 3–20 chars)
예: malt_lover | 例: malt_lover | e.g. malt_lover
비밀번호 (6자 이상) | パスワード(6文字以上) | Password (6+ characters)
비밀번호 확인 | パスワード(確認) | Confirm password
복구용 이메일 (선택) | 復旧用メール(任意) | Recovery email (optional)
비밀번호를 잊었을 때 재설정 메일을 받을 주소 | パスワードを忘れたときに再設定メールを受け取るアドレス | Where to send a reset email if you forget your password
적지 않으면 비밀번호를 잊었을 때 되찾을 방법이 없어요. | 入力しないと、パスワードを忘れたときに復旧できません。 | Without it, there's no way to recover a forgotten password.
영문 소문자·숫자·_ 3~20자로 적어 주세요 | 英小文字・数字・_ の3〜20文字で入力してください | Use 3–20 lowercase letters, digits or _
이미 쓰고 있는 아이디예요 | すでに使われているIDです | That ID is already taken
✓ 사용할 수 있어요 | ✓ 使用できます | ✓ Available
아이디를 형식에 맞게 적어 주세요 | IDを正しい形式で入力してください | Enter the ID in the right format
비밀번호 확인이 일치하지 않아요 | パスワード(確認)が一致しません | The passwords don't match
복구용 이메일 형식이 올바르지 않아요 | 復旧用メールの形式が正しくありません | The recovery email doesn't look right
이미 다른 계정에 쓰인 이메일이에요 | すでに別のアカウントで使われているメールです | That email is already used by another account
마신 술을 사진·장소·향·가격과 함께 기록하고, | 飲んだお酒を写真・場所・香り・価格と一緒に記録して、 | Log what you drink with photos, places, aromas and prices,
취향이 맞는 사람들과 나누는 초대제 모임 | 好みの合う人たちと共有する招待制コミュニティ | and share it with an invite-only circle
Google로 시작하기 | Googleで始める | Continue with Google
👀 게스트로 둘러보기 | 👀 ゲストとして見てみる | 👀 Browse as a guest
또는 아이디로 | またはIDで | or with an ID
아이디 | ID | ID
비밀번호 | パスワード | Password
로그인 | ログイン | Sign in
비밀번호를 잊으셨나요? | パスワードをお忘れですか? | Forgot your password?
가입은 기존 멤버의 승인이 필요해요. | 登録には既存メンバーの承認が必要です。 | Joining needs approval from an existing member.
님의 초대로 오셨네요. | さんの招待ですね。 | invited you.
앱 주소 QR | アプリURLのQR | App link QR
언어 | 言語 | Language
게스트로 둘러보는 중이에요 | ゲストとして閲覧中です | You're browsing as a guest
🔒 작성자, 메모, 장소, 가격, 댓글, 쪽지, 지도는 | 🔒 投稿者・メモ・場所・価格・コメント・メッセージ・地図は | 🔒 Authors, notes, places, prices, comments, messages and maps
가입한 멤버만 볼 수 있어요. | 登録メンバーだけが見られます。 | are visible to members only.
가입·로그인하고 전체 보기 | 登録・ログインしてすべて見る | Join or sign in to see everything
👍 추천 | 👍 おすすめ | 👍 Recommended
아직 공유된 글이 없어요. | まだ共有された投稿がありません。 | Nothing has been shared yet.
자세한 내용은 가입한 멤버만 볼 수 있어요. 가입하러 갈까요? | 詳細は登録メンバーだけが見られます。登録しますか? | Details are for members only. Go to sign-up?
가입하기 | 登録する | Sign up
연결에 실패했어요 | 接続に失敗しました | Connection failed
다시 시도 | 再試行 | Try again
로그아웃 | ログアウト | Sign out
가입 신청 | 登録申請 | Request to join
{0} 님, 처음 오셨네요. | {0} さん、はじめまして。 | Welcome, {0}.
{0} 님, 처음 오셨네요. 첫 멤버(관리자)로 시작해요. | {0} さん、はじめまして。最初のメンバー(管理者)として始めます。 | Welcome, {0}. You'll start as the first member (admin).
추천인이 승인하면 가입이 완료돼요. | 紹介者が承認すると登録が完了します。 | You're in once your referrer approves.
닉네임 | ニックネーム | Nickname
추천인 아이디 | 紹介者のID | Referrer's ID
추천해 줄 멤버의 아이디 | 紹介してくれるメンバーのID | ID of the member referring you
시작하기 | 始める | Get started
다른 계정으로 | 別のアカウントで | Use another account
로그인 아이디와 같아요 | ログインIDと同じです | Same as your sign-in ID
추천인 아이디를 입력해 주세요 | 紹介者のIDを入力してください | Enter your referrer's ID
그 아이디의 멤버를 찾지 못했어요 | そのIDのメンバーが見つかりません | No member with that ID
아직 승인된 멤버가 아니라서 추천인이 될 수 없어요 | まだ承認されたメンバーではないため、紹介者になれません | They aren't an approved member yet, so they can't refer you
본인은 추천인이 될 수 없어요 | 自分を紹介者にはできません | You can't refer yourself
추천인으로 선택됨 ✓ | 紹介者として選択 ✓ | selected as referrer ✓
닉네임을 입력해 주세요 | ニックネームを入力してください | Enter a nickname
추천인을 검색해서 선택해 주세요 | 紹介者を検索して選んでください | Search for and select a referrer
이미 쓰는 아이디이거나 규칙이 아직 게시되지 않았어요 | すでに使われているIDか、ルールがまだ公開されていません | That ID is taken, or the rules aren't published yet
승인을 기다리는 중 | 承認待ち | Waiting for approval
({0}) 님이 승인하면 | ({0}) さんが承認すると | ({0}) needs to approve you;
자동으로 가입이 완료돼요. | 自動的に登録が完了します。 | then you're in automatically.
추천인이 앱을 열어야 요청이 보이니, 따로 알려 주세요. | 紹介者がアプリを開かないと申請が見えないので、別途知らせてください。 | They only see the request when they open the app, so let them know.
내 신청 정보 | 申請内容 | Your request
추천인에게 보낼 안내 복사 | 紹介者に送る案内をコピー | Copy a note for your referrer
신청 취소 | 申請を取り消す | Cancel request
飲みログ 가입 승인 부탁드려요! 앱을 열고 [나] 탭에서 가입 요청을 승인해 주세요. 제 아이디는 @{0} 예요. | 飲みログの登録承認をお願いします!アプリを開いて[マイ]タブで登録申請を承認してください。私のIDは @{0} です。 | Please approve my 飲みログ sign-up! Open the app and approve the request in the [Me] tab. My ID is @{0}.
복사했어요. 메신저에 붙여 넣으세요 | コピーしました。メッセンジャーに貼り付けてください | Copied. Paste it into your messenger
복사하지 못했어요 | コピーできませんでした | Couldn't copy
가입 신청을 취소할까요? | 登録申請を取り消しますか? | Cancel your request to join?
취소하기 | 取り消す | Cancel it
신청이 거절됐어요 | 申請が拒否されました | Your request was declined
추천인이 요청을 승인하지 않았어요. | 紹介者が申請を承認しませんでした。 | Your referrer didn't approve the request.
다른 추천인으로 다시 신청할 수 있어요. | 別の紹介者でもう一度申請できます。 | You can apply again with a different referrer.
다시 신청하기 | もう一度申請する | Apply again
쪽지 | メッセージ | Messages
+ 새 쪽지 | + 新規メッセージ | + New message
✉️ 쪽지 | ✉️ メッセージ | ✉️ Message
나: {0} | 自分: {0} | You: {0}
주고받은 쪽지가 없어요. | メッセージはまだありません。 | No messages yet.
멤버 프로필에서 쪽지를 보낼 수 있어요. | メンバーのプロフィールからメッセージを送れます。 | You can message a member from their profile.
첫 쪽지를 보내 보세요. | 最初のメッセージを送ってみましょう。 | Send the first message.
메시지를 입력하세요 | メッセージを入力 | Type a message
보내기 | 送信 | Send
알림 | 通知 | Notifications
모두 읽음 | すべて既読 | Mark all read
님이 내 글에 좋아요를 눌렀어요 | さんがあなたの投稿にいいねしました | liked your post
님이 내 글에 댓글을 남겼어요 | さんがあなたの投稿にコメントしました | commented on your post
님이 글의 메모에서 나를 언급했어요 | さんがメモであなたをメンションしました | mentioned you in a note
님의 알림 | さんからの通知 | sent a notification
🔔 {0}님이 내 글에 좋아요를 눌렀어요 | 🔔 {0}さんがあなたの投稿にいいねしました | 🔔 {0} liked your post
🔔 {0}님이 내 글에 댓글을 남겼어요 | 🔔 {0}さんがあなたの投稿にコメントしました | 🔔 {0} commented on your post
🔔 {0}님이 글의 메모에서 나를 언급했어요 | 🔔 {0}さんがメモであなたをメンションしました | 🔔 {0} mentioned you in a note
🔔 {0}님의 알림 | 🔔 {0}さんからの通知 | 🔔 Notification from {0}
가입 승인 요청 {0}건 | 登録承認の申請 {0}件 | {0} request(s) to join
가입 승인 요청 ({0}) | 登録承認の申請 ({0}) | Requests to join ({0})
눌러서 승인하러 가기 → | タップして承認へ → | Tap to review →
아직 알림이 없어요. | まだ通知はありません。 | No notifications yet.
내 글에 좋아요나 댓글이 달리면 여기에 떠요. | 投稿にいいねやコメントが付くとここに表示されます。 | Likes and comments on your posts show up here.
삭제되었거나 공유가 해제된 글이에요 | 削除されたか、共有が解除された投稿です | That post was deleted or is no longer shared
👥 팔로잉 | 👥 フォロー中 | 👥 Following
👍 추천만 | 👍 おすすめのみ | 👍 Recommended
🔎 사람 찾기 | 🔎 メンバーを探す | 🔎 Find people
↻ 새로고침 | ↻ 更新 | ↻ Refresh
추천이 달린 글이 아직 없어요. | おすすめ付きの投稿はまだありません。 | No recommended posts yet.
팔로우한 멤버의 글이 아직 없어요. | フォロー中のメンバーの投稿はまだありません。 | No posts from people you follow yet.
에서 멤버를 팔로우해 보세요. | でメンバーをフォローしてみましょう。 | is where you can follow members.
피드가 비어 있어요. | フィードは空です。 | The feed is empty.
기록을 쓰고 | 記録を書いて | Write an entry and choose
멤버에게 공유 | メンバーに共有 | Share with members
하면 모든 멤버에게 보여요. | すると、すべてのメンバーに表示されます。 | to show it to every member.
새로고침했어요 | 更新しました | Refreshed
피드 | フィード | Feed
기록 | 記録 | Log
장소 | 場所 | Places
나 | マイ | Me
다녀온 곳 | 訪れた場所 | Places visited
이름, 생산자, 장소, 향 검색 | 名前・生産者・場所・香りで検索 | Search name, producer, place, aroma
아직 기록이 없어요. | まだ記録がありません。 | No entries yet.
아래 | 下の | Use the
버튼으로 첫 잔을 남겨 보세요. | ボタンで最初の一杯を記録しましょう。 | button below to log your first drink.
조건에 맞는 기록이 없어요. | 条件に合う記録がありません。 | No entries match.
공유 중 | 共有中 | Shared
장소 미입력 | 場所未入力 | No place
{0}잔 {1} | {0}杯 {1} | {0} drinks {1}
{0}잔 | {0}杯 | {0} drinks
마지막 방문 {0} | 最終訪問 {0} | Last visit {0}
평균 {0} | 平均 {0} | avg {0}
최고 평점: {0} | 最高評価: {0} | Top rated: {0}
이곳의 기록 보기 → | この場所の記録を見る → | See entries here →
기록에 장소를 넣으면 여기에 모여요. | 記録に場所を入れるとここにまとまります。 | Places from your entries are collected here.
장소는 내 기록에서만 모아 보여요. | 場所は自分の記録だけから集計されます。 | Only your own entries are counted.
구글맵 | Googleマップ | Google Maps
구글맵 검색 | Googleマップで検索 | Search Google Maps
저장한 링크 | 保存したリンク | Saved link
구글맵 ↗ | Googleマップ ↗ | Google Maps ↗
구글맵 검색 ↗ | Googleマップで検索 ↗ | Search Google Maps ↗
저장한 링크 ↗ | 保存したリンク ↗ | Saved link ↗
수정 | 編集 | Edit
👍 이럴 때 추천해요 | 👍 こんなときにおすすめ | 👍 Recommended for
평점 | 評価 | Rating
시간 | 日時 | When
가격 | 価格 | Price
향 (노즈) | 香り(ノーズ) | Nose
맛 (팔레트) | 味(パレート) | Palate
여운 (피니시) | 余韻(フィニッシュ) | Finish
경험 · 메모 | 体験・メモ | Notes
좋아요 · 댓글 | いいね・コメント | Likes · Comments
여기서 한 잔 더 | ここでもう一杯 | Another one here
“{0}” 기록을 삭제할까요? 사진과 공유한 글도 함께 지워져요. | 「{0}」の記録を削除しますか?写真と共有した投稿も一緒に消えます。 | Delete “{0}”? Its photos and shared post go too.
공유된 글을 찾지 못했어요. | 共有された投稿が見つかりません。 | Couldn't find the shared post.
댓글 달기… | コメントを書く… | Add a comment…
댓글을 삭제할까요? | コメントを削除しますか? | Delete this comment?
팔로잉 | フォロー中 | Following
팔로우 | フォロー | Follow
팔로워 | フォロワー | Followers
글 | 投稿 | Posts
사람 찾기 | メンバーを探す | Find people
아이디로 검색 (앞부분만 써도 돼요) | IDで検索(先頭だけでもOK) | Search by ID (a prefix is enough)
아이디를 입력해 멤버를 찾아 보세요. | IDを入力してメンバーを探しましょう。 | Type an ID to find a member.
찾는 멤버가 없어요. | 該当するメンバーがいません。 | No matching members.
프로필 | プロフィール | Profile
멤버를 찾을 수 없어요. | メンバーが見つかりません。 | Member not found.
공유한 기록 | 共有した記録 | Shared entries
공유한 기록이 아직 없어요. | 共有した記録はまだありません。 | No shared entries yet.
앱 주소 QR 코드 | アプリURLのQRコード | App link QR code
이 QR로 들어오면 추천인에 | このQRから入ると、紹介者に | Anyone joining with this QR gets
가 자동으로 입력돼요. | が自動で入力されます。 | filled in as their referrer.
QR 이미지 복사 | QR画像をコピー | Copy QR image
링크 복사 | リンクをコピー | Copy link
초대 문구 복사 | 招待文をコピー | Copy invite text
이미지 저장 | 画像を保存 | Save image
QR을 만들 수 없어요 | QRを作成できません | Couldn't make the QR
복사해서 사용하세요 | コピーして使ってください | Copy this
飲みログ에 초대해요 🥃 | 飲みログに招待します 🥃 | You're invited to 飲みログ 🥃
추천인 아이디: @{0} | 紹介者のID: @{0} | Referrer ID: @{0}
링크를 복사했어요 | リンクをコピーしました | Link copied
초대 문구를 복사했어요 | 招待文をコピーしました | Invite text copied
이미지를 저장했어요 | 画像を保存しました | Image saved
QR 이미지를 복사했어요 | QR画像をコピーしました | QR image copied
이 브라우저는 이미지 복사를 못해요. 이미지 저장을 써 주세요 | このブラウザは画像をコピーできません。「画像を保存」を使ってください | This browser can't copy images. Use Save image instead
QR 코드 | QRコード | QR code
친구가 이 QR로 접속해 가입하면, 추천인 칸에 내 아이디 | 友だちがこのQRから登録するとき、紹介者欄にあなたのID | When a friend signs up with this QR, have them enter your ID
를 적게 하세요. | を入力してもらいましょう。 | as the referrer.
프로필 수정 | プロフィール編集 | Edit profile
내 공유글 보기 | 自分の共有投稿を見る | View my shared posts
님이 나를 추천인으로 지정했어요 | さんがあなたを紹介者に指定しました | named you as their referrer
@{0} 님이 나를 추천인으로 지정했어요 | @{0} さんがあなたを紹介者に指定しました | @{0} named you as their referrer
거절 | 拒否 | Decline
승인 | 承認 | Approve
QR 코드로 초대하기 | QRコードで招待 | Invite with a QR code
내가 추천한 멤버 ({0}) | 自分が紹介したメンバー ({0}) | Members you referred ({0})
아직 없어요. 친구가 가입할 때 내 아이디 | まだいません。友だちが登録するときにあなたのID | None yet. When a friend enters your ID
를 추천인으로 적으면, 여기서 승인할 수 있어요. | を紹介者として入力すると、ここで承認できます。 | as their referrer, you can approve them here.
내 추천인 | 自分の紹介者 | Your referrer
첫 멤버(관리자)예요. | 最初のメンバー(管理者)です。 | You're the first member (admin).
관리자 | 管理者 | Admin
👑 멤버 관리 | 👑 メンバー管理 | 👑 Manage members
계정 | アカウント | Account
이 가입 요청을 거절할까요? | この登録申請を拒否しますか? | Decline this request to join?
멤버 | メンバー | Member
승인 대기 | 承認待ち | Pending
거절됨 | 拒否済み | Declined
멤버 관리 | メンバー管理 | Manage members
전체 {0}명 · 멤버 {1} · 승인 대기 {2} · 거절 {3} | 全{0}人 · メンバー {1} · 承認待ち {2} · 拒否 {3} | {0} total · {1} members · {2} pending · {3} declined
추천인: {0} | 紹介者: {0} | Referrer: {0}
없음 (관리자) | なし(管理者) | none (admin)
초대한 사람 {0}명 | 招待した人 {0}人 | invited {0}
신청 {0} | 申請 {0} | Applied {0}
승인 {0} | 承認 {0} | Approved {0}
승인한 사람 {0} | 承認者 {0} | by {0}
승인한 사람 기록 없음(추천인으로 추정) | 承認者の記録なし(紹介者と推定) | approver not recorded (presumably the referrer)
{0} 님을 내보낼까요? 멤버 정보와 아이디가 삭제돼요. 올린 글은 남아요. | {0} さんを退会させますか?メンバー情報とIDは削除されます。投稿は残ります。 | Remove {0}? Their membership and ID are deleted. Their posts stay.
내보내기 | 退会させる | Remove
내보냈어요 | 退会させました | Removed
승인했어요. 이제 멤버예요 🎉 | 承認しました。これでメンバーです 🎉 | Approved. They're a member now 🎉
거절했어요 | 拒否しました | Declined
소개 (선택) | 自己紹介(任意) | Bio (optional)
아이디(@{0})는 바꿀 수 없어요. | ID(@{0})は変更できません。 | Your ID (@{0}) can't be changed.
저장했어요 | 保存しました | Saved
기록 수정 | 記録を編集 | Edit entry
주종 | お酒の種類 | Type
사진 (필수) | 写真(必須) | Photos (required)
사진에 위치·촬영 시간이 남아 있으면 자동으로 채워져요. 최대 6장. | 写真に位置・撮影日時が残っていれば自動で入力されます。最大6枚。 | Location and time are filled in from the photo if it has them. Up to 6.
술 | お酒 | Drink
이름 * | 名前 * | Name *
예: 글렌드로낙 15, 지역 막걸리 이름 등 | 例: グレンドロナック15、地酒の名前など | e.g. GlenDronach 15, a local sake…
세부 종류 | 細かい種類 | Style
생산자 | 生産者 | Producer
산지 · 지역 | 産地・地域 | Origin · Region
예: 스페이사이드, 부르고뉴 | 例: スペイサイド、ブルゴーニュ | e.g. Speyside, Burgundy
빈티지 · 숙성 | ヴィンテージ・熟成 | Vintage · Age
도수 (%) | 度数 (%) | ABV (%)
세부 정보 | 詳細 | Details
장소 이름 | 場所の名前 | Place name
바, 식당, 양조장, 집… | バー、レストラン、蔵、自宅… | Bar, restaurant, brewery, home…
주소 (선택) | 住所(任意) | Address (optional)
도로명 주소나 동네 (예: 서울 강남구 논현동) | 住所やエリア(例: 東京都中央区銀座) | Street address or area (e.g. Ginza, Chuo, Tokyo)
구글맵에서 찾아보기 ↗ | Googleマップで探す ↗ | Look up on Google Maps ↗
주소를 적으면 기록에 지도가 함께 보여요. 주소를 찾지 못하면 지도 없이 구글맵 검색 링크만 보여요. | 住所を入れると記録に地図が表示されます。住所が見つからない場合は、地図なしでGoogleマップ検索リンクだけ表示します。 | With an address, the entry shows a map. If the address can't be found, it shows only a Google Maps search link.
시간 · 가격 | 日時・価格 | Time · Price
마신 시간 | 飲んだ日時 | When
가격 (원) | 価格(ウォン) | Price (KRW)
기준 | 単位 | Per
향 · 맛 | 香り・味 | Aroma · Taste
태그 직접 추가 | タグを追加 | Add your own tag
경험 | 体験 | Experience
메모 (누구와, 분위기, 페어링 등) | メモ(誰と、雰囲気、ペアリングなど) | Notes (who with, mood, pairing…)
공유 | 共有 | Sharing
🔒 나만 보기 | 🔒 自分だけ | 🔒 Only me
👥 멤버에게 공유 | 👥 メンバーに共有 | 👥 Share with members
공유하면 승인된 모든 멤버의 피드에 올라가요. | 共有すると、承認済みメンバー全員のフィードに表示されます。 | Shared entries appear in every approved member's feed.
나만 볼 수 있어요. 피드에 올라가지 않아요. | 自分だけが見られます。フィードには表示されません。 | Only you can see it. It won't appear in the feed.
👍 이 술을 추천해요 | 👍 このお酒をおすすめする | 👍 I recommend this
추천 한마디 (예: 비 오는 날 혼술로 딱) | おすすめの一言(例: 雨の日のひとり飲みにぴったり) | One line on why (e.g. perfect for a rainy night in)
공유할 범위 | 共有する範囲 | What to share
가격 공개 | 価格を公開 | Show price
메모 공개 | メモを公開 | Show notes
숨김 | 非公開 | Hidden
장소 이름만 | 場所の名前のみ | Place name only
주소·좌표까지 공개 | 住所・座標まで公開 | Address and location too
공유한 글은 승인된 멤버 누구나 볼 수 있어요. 좌표·가격은 위에서 고른 것만 복사돼요. | 共有した投稿は承認済みメンバーなら誰でも見られます。座標・価格は上で選んだものだけコピーされます。 | Any approved member can see shared posts. Only the location and price options chosen above are included.
이 기록 삭제 | この記録を削除 | Delete this entry
장소 이름이나 주소를 먼저 적어 주세요 | 先に場所の名前か住所を入力してください | Enter a place name or address first
{0}점 | {0}点 | {0} / 5
별의 왼쪽 반을 누르면 0.5점 | 星の左半分をタップすると0.5点 | Tap the left half of a star for half points
사진 추가 | 写真を追加 | Add photo
사진의 위치로 주소를 채웠어요 📍 | 写真の位置から住所を入力しました 📍 | Address filled in from the photo's location 📍
이 사진은 열 수 없어요 | この写真は開けません | Can't open this photo
사진 처리가 끝나면 저장할 수 있어요 | 写真の処理が終わると保存できます | You can save once the photos finish processing
사진을 한 장 이상 올려 주세요 📷 | 写真を1枚以上追加してください 📷 | Add at least one photo 📷
이름을 입력해 주세요 | 名前を入力してください | Enter a name
저장하고 멤버에게 공유했어요 🥂 | 保存してメンバーに共有しました 🥂 | Saved and shared with members 🥂
저장했어요 🥃 | 保存しました 🥃 | Saved 🥃
삭제했어요 | 削除しました | Deleted
위스키 | ウイスキー | Whisky
와인 | ワイン | Wine
맥주 | ビール | Beer
사케 | 日本酒 | Sake
일본소주 | 焼酎 | Shochu
막걸리 | マッコリ | Makgeolli
전통주 | 韓国伝統酒 | Korean traditional
바이주 | 白酒 | Baijiu
꼬냑 | コニャック | Cognac
알마냑 | アルマニャック | Armagnac
브랜디 | ブランデー | Brandy
럼 | ラム | Rum
진 | ジン | Gin
데킬라·메즈칼 | テキーラ・メスカル | Tequila · Mezcal
보드카 | ウォッカ | Vodka
리큐르 | リキュール | Liqueur
칵테일 | カクテル | Cocktail
사이다·미드 | シードル・ミード | Cider · Mead
증류소 | 蒸留所 | Distillery
와이너리 | ワイナリー | Winery
브루어리 | ブルワリー | Brewery
양조장 | 蔵元・醸造所 | Brewery
주창 | 酒廠 | Distillery
하우스 | メゾン | House
베이스 | ベース | Base
숙성 (년) | 熟成(年) | Age (years)
숙성 | 熟成 | Age
빈티지 | ヴィンテージ | Vintage
캐스크 | カスク | Cask
품종 | 品種 | Grape
스타일 · 홉 | スタイル・ホップ | Style · Hops
쌀 · 정미율 | 米・精米歩合 | Rice · Polishing
원료 · 누룩 | 原料・麹 | Base · Koji
원료 | 原料 | Ingredients
크뤼 | クリュ | Cru
지역 · 품종 | 地域・品種 | Region · Grape
원료 · 숙성 | 原料・熟成 | Base · Aging
보태니컬 | ボタニカル | Botanicals
아가베 | アガベ | Agave
레시피 | レシピ | Recipe
원료 · 특징 | 原料・特徴 | Base · Character
예: PX 셰리, 버번 배럴 | 例: PXシェリー、バーボンバレル | e.g. PX sherry, bourbon barrel
예: 피노 누아, 리슬링 | 例: ピノ・ノワール、リースリング | e.g. Pinot Noir, Riesling
예: 뉴잉글랜드 IPA, 시트라 홉 | 例: ニューイングランドIPA、シトラホップ | e.g. New England IPA, Citra hops
예: 야마다니시키 50% | 例: 山田錦 50% | e.g. Yamada Nishiki 50%
예: 고구마, 흑누룩 | 例: 芋、黒麹 | e.g. sweet potato, black koji
예: 국내산 찹쌀, 전통 누룩 | 例: 国産もち米、伝統麹 | e.g. glutinous rice, traditional nuruk
예: 쌀, 오미자 | 例: 米、五味子 | e.g. rice, omija
예: 수수 | 例: 高粱 | e.g. sorghum
예: 그랑드 샹파뉴 | 例: グランド・シャンパーニュ | e.g. Grande Champagne
예: 바 아르마냑, 폴 블랑슈 | 例: バ・アルマニャック、フォル・ブランシュ | e.g. Bas-Armagnac, Folle Blanche
예: 사과, 포도박 | 例: りんご、ぶどうの搾りかす | e.g. apple, grape pomace
예: 당밀, 버번 캐스크 | 例: 糖蜜、バーボンカスク | e.g. molasses, bourbon cask
예: 유자, 편백 | 例: 柚子、ひのき | e.g. yuzu, hinoki
예: 에스파딘 | 例: エスパディン | e.g. Espadín
예: 밀, 감자 | 例: 小麦、じゃがいも | e.g. wheat, potato
예: 진, 캄파리, 베르무트 | 例: ジン、カンパリ、ベルモット | e.g. gin, Campari, vermouth
예: 아니스, 사탕수수 | 例: アニス、さとうきび | e.g. anise, sugar cane
싱글몰트 | シングルモルト | Single malt
블렌디드 몰트 | ブレンデッドモルト | Blended malt
블렌디드 | ブレンデッド | Blended
버번 | バーボン | Bourbon
테네시 | テネシー | Tennessee
라이 | ライ | Rye
싱글 그레인 | シングルグレーン | Single grain
재패니즈 | ジャパニーズ | Japanese
아이리시 | アイリッシュ | Irish
레드 | 赤 | Red
화이트 | 白 | White
로제 | ロゼ | Rosé
스파클링 | スパークリング | Sparkling
샴페인 | シャンパーニュ | Champagne
오렌지·내추럴 | オレンジ・ナチュラル | Orange · Natural
주정강화 (포트·셰리) | 酒精強化(ポート・シェリー) | Fortified (Port · Sherry)
디저트 | デザート | Dessert
라거 | ラガー | Lager
필스너 | ピルスナー | Pilsner
페일에일 | ペールエール | Pale ale
스타우트·포터 | スタウト・ポーター | Stout · Porter
밀맥주 | ヴァイツェン | Wheat beer
사워·람빅 | サワー・ランビック | Sour · Lambic
벨지안 | ベルジャン | Belgian
세종 | セゾン | Saison
준마이 | 純米 | Junmai
준마이긴조 | 純米吟醸 | Junmai Ginjo
준마이다이긴조 | 純米大吟醸 | Junmai Daiginjo
긴조 | 吟醸 | Ginjo
다이긴조 | 大吟醸 | Daiginjo
혼조조 | 本醸造 | Honjozo
니고리 | にごり | Nigori
나마자케 | 生酒 | Namazake
이모 (고구마) | 芋 | Imo (sweet potato)
무기 (보리) | 麦 | Mugi (barley)
고메 (쌀) | 米 | Kome (rice)
코쿠토 (흑당) | 黒糖 | Kokuto (brown sugar)
소바 (메밀) | そば | Soba (buckwheat)
아와모리 | 泡盛 | Awamori
생막걸리 | 生マッコリ | Unpasteurized
살균막걸리 | 殺菌マッコリ | Pasteurized
프리미엄 | プレミアム | Premium
과일 막걸리 | フルーツマッコリ | Fruit makgeolli
약주 | 薬酒(ヤクチュ) | Yakju
청주 | 清酒(チョンジュ) | Cheongju
증류식 소주 | 蒸留式焼酎(ソジュ) | Distilled soju
과실주 | 果実酒 | Fruit wine
침출주·리큐르 | 浸漬酒・リキュール | Infusion · Liqueur
장향 (酱香) | 醤香 | Sauce aroma (酱香)
농향 (浓香) | 濃香 | Strong aroma (浓香)
청향 (清香) | 清香 | Light aroma (清香)
미향 (米香) | 米香 | Rice aroma (米香)
봉향 (凤香) | 鳳香 | Feng aroma (凤香)
겸향 | 兼香 | Mixed aroma
오르다주 | オール・ダージュ | Hors d'âge
칼바도스 | カルヴァドス | Calvados
그라파 | グラッパ | Grappa
피스코 | ピスコ | Pisco
오드비 | オー・ド・ヴィー | Eau-de-vie
기타 브랜디 | その他のブランデー | Other brandy
골드 | ゴールド | Gold
다크 | ダーク | Dark
아그리콜 | アグリコール | Agricole
스파이스드 | スパイスド | Spiced
런던 드라이 | ロンドンドライ | London Dry
올드 톰 | オールドトム | Old Tom
컨템포러리 | コンテンポラリー | Contemporary
슬로 진 | スロージン | Sloe gin
블랑코 | ブランコ | Blanco
레포사도 | レポサド | Reposado
아녜호 | アネホ | Añejo
엑스트라 아녜호 | エクストラ・アネホ | Extra Añejo
메즈칼 | メスカル | Mezcal
플레인 | プレーン | Plain
플레이버드 | フレーバード | Flavored
크림 | クリーム | Cream
아마로 | アマーロ | Amaro
클래식 | クラシック | Classic
시그니처 | シグネチャー | Signature
하이볼 | ハイボール | Highball
논알콜 | ノンアルコール | Non-alcoholic
사이다 | シードル | Cider
페리 | ペリー | Perry
미드 | ミード | Mead
라크 | ラク | Rakı
우조 | ウーゾ | Ouzo
아락 | アラック | Arak
카샤사 | カシャッサ | Cachaça
희석식 소주 | 希釈式焼酎(ソジュ) | Diluted soju
그 밖의 지역 술 | その他の地酒 | Other regional drinks
건포도 | レーズン | Raisin
무화과 | いちじく | Fig
바닐라 | バニラ | Vanilla
오크 | オーク | Oak
꽃 | 花 | Floral
시트러스 필 | 柑橘の皮 | Citrus peel
꿀 | はちみつ | Honey
견과 | ナッツ | Nuts
초콜릿 | チョコレート | Chocolate
가죽 | レザー | Leather
스파이스 | スパイス | Spice
랑시오 | ランシオ | Rancio
캐러멜 | キャラメル | Caramel
셰리 | シェリー | Sherry
건과일 | ドライフルーツ | Dried fruit
사과·배 | りんご・梨 | Apple · Pear
시트러스 | 柑橘 | Citrus
열대과일 | トロピカルフルーツ | Tropical fruit
몰트·곡물 | モルト・穀物 | Malt · Grain
피트·스모크 | ピート・スモーク | Peat · Smoke
요오드·바다 | ヨード・潮 | Iodine · Sea
가죽·담배 | レザー・タバコ | Leather · Tobacco
검은 과실 | 黒い果実 | Dark fruit
붉은 과실 | 赤い果実 | Red fruit
복숭아·핵과 | 桃・核果 | Peach · Stone fruit
허브 | ハーブ | Herbal
후추·스파이스 | 胡椒・スパイス | Pepper · Spice
오크·바닐라 | オーク・バニラ | Oak · Vanilla
토스트·브리오슈 | トースト・ブリオッシュ | Toast · Brioche
흙·버섯 | 土・きのこ | Earth · Mushroom
미네랄 | ミネラル | Mineral
홉·시트러스 | ホップ・柑橘 | Hops · Citrus
송진 | 松やに | Pine resin
몰트·빵 | モルト・パン | Malt · Bread
커피 | コーヒー | Coffee
바나나 | バナナ | Banana
정향 | クローブ | Clove
산미 | 酸味 | Acidity
쓴맛 | 苦味 | Bitter
멜론 | メロン | Melon
쌀·누룩 | 米・麹 | Rice · Koji
요구르트 | ヨーグルト | Yogurt
감칠맛 | 旨味 | Umami
드라이 | ドライ | Dry
단맛 | 甘味 | Sweet
고구마 | さつまいも | Sweet potato
보리·고소함 | 麦・香ばしさ | Barley · Toasty
쌀 | 米 | Rice
흑당 | 黒糖 | Brown sugar
흙내 | 土の香り | Earthy
감귤 | みかん | Mandarin
스모키 | スモーキー | Smoky
깔끔함 | すっきり | Clean
누룩 | 麹(ヌルク) | Nuruk
탄산 | 炭酸 | Fizzy
고소함 | 香ばしさ | Nutty
과실 | 果実 | Fruit
한약재 | 漢方 | Medicinal herbs
생강 | 生姜 | Ginger
계피 | シナモン | Cinnamon
배 | 梨 | Pear
오미자 | 五味子 | Omija
간장·발효 | 醤油・発酵 | Soy · Fermented
파인애플 | パイナップル | Pineapple
수수 | 高粱 | Sorghum
감초 | 甘草 | Licorice
사과 | りんご | Apple
향신료 | 香辛料 | Spices
풀 | 草 | Grassy
펑키 (에스테르) | ファンキー(エステル) | Funky (esters)
주니퍼 | ジュニパー | Juniper
후추 | 胡椒 | Pepper
오이 | きゅうり | Cucumber
구운 아가베 | ローストアガベ | Roasted agave
스모크 | スモーク | Smoke
곡물 | 穀物 | Grain
크리미 | クリーミー | Creamy
과일 | フルーツ | Fruit
`;

  const col = lang === "ja" ? 1 : 2;
  const EX = new Map(), PAT = [];
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const line of RAW.split("\n")) {
    const p = line.split(" | "); if (p.length < 3) continue;
    const ko = p[0].trim(), to = p[col].trim();
    if (/\{\d\}/.test(ko)) PAT.push([new RegExp("^" + reEsc(ko).replace(/\\\{(\d)\\\}/g, "([\\s\\S]+?)") + "$"), to, [...ko.matchAll(/\{(\d)\}/g)].map(m => +m[1])]);
    else EX.set(ko, to);
  }
  const HAN = /[가-힣]/;
  function whole(s) {                                // 통째로 맞는 것만: 사전 → 틀 → 앞의 이모지 떼고 다시
    if (EX.has(s)) return EX.get(s);
    for (const [re, to, order] of PAT) { const m = s.match(re); if (m) { const vals = []; order.forEach((n, i) => { vals[n] = tr(m[i + 1]); }); return to.replace(/\{(\d)\}/g, (_, n) => vals[+n] ?? ""); } }
    const m = s.match(/^([^\p{L}\p{N}@(“]+\s)([\s\S]+)$/u); if (m && EX.has(m[2])) return m[1] + EX.get(m[2]);
    return null;
  }
  function tr(s) {
    if (typeof s !== "string" || !HAN.test(s)) return s;
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim();
    let out = EX.has(core) ? EX.get(core) : null;
    const parts = core.split(/(\s*·\s*|\s+\/\s+|^\/\s+|\n)/); let partial = null;
    if (out == null && parts.length > 1) {            // " · ", " / ", 줄바꿈으로 나눠 조각별로
      let hit = false, all = true;
      const res = parts.map((x, i) => { if (i % 2 || !HAN.test(x)) return x; const t = whole(x.trim()); if (t == null) { all = false; return x; } hit = true; return t; });
      if (hit && all) out = res.join(""); else if (hit) partial = res.join("");
    }
    if (out == null) out = whole(core);
    if (out == null) out = partial;
    if (out == null) { (window.__untr = window.__untr || new Set()).add(core); return s; }
    return lead + out + tail;
  }
  window.TR = tr;

  const ATTRS = ["placeholder", "title", "aria-label", "alt"];
  const skip = n => { const e = n.nodeType === 1 ? n : n.parentElement; return !e || e.closest("[data-noi18n],script,style,textarea"); };
  function textNode(n) { if (!HAN.test(n.nodeValue) || skip(n)) return; const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  function element(el) {
    if (skip(el)) return;
    if (el.tagName === "OPTION" && !el.hasAttribute("value")) el.setAttribute("value", el.textContent);   // 저장되는 값은 그대로 둔다
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v && HAN.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  }
  function walk(root) {
    if (root.nodeType === 3) return textNode(root); if (root.nodeType !== 1) return;
    element(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? textNode(n) : element(n);
  }
  function start() {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) {
      if (m.type === "characterData") textNode(m.target);
      else if (m.type === "attributes") element(m.target);
      else m.addedNodes.forEach(walk);
    } }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
