const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

async function uploadToDrive() {
    // 必須環境変数の確認
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
        console.error("❌ 環境変数 GOOGLE_SERVICE_ACCOUNT が設定されていません。");
        process.exit(1);
    }
    if (!process.env.GDRIVE_FOLDER_ID) {
        console.error("❌ 環境変数 GDRIVE_FOLDER_ID が設定されていません。");
        process.exit(1);
    }

    let credentials;
    try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    } catch {
        console.error("❌ GOOGLE_SERVICE_ACCOUNT の JSON が不正です。シークレットの内容を確認してください。");
        process.exit(1);
    }
    const serviceAccountEmail = credentials.client_email;
    if (!serviceAccountEmail) {
        console.error("❌ GOOGLE_SERVICE_ACCOUNT に client_email フィールドが含まれていません。サービスアカウントキーの JSON を確認してください。");
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.GDRIVE_FOLDER_ID;
    const notesDir = "notes";

    // ─── フォルダのメタデータを取得（アクセス可否・種別・書き込み権限を確認） ───
    let folderMeta;
    try {
        folderMeta = await drive.files.get({
            fileId: folderId,
            supportsAllDrives: true,
            fields: "id,name,driveId,capabilities",
        });
    } catch (err) {
        const code = err.code ?? err.status;
        if (code === 404) {
            console.error(
                `❌ フォルダが見つかりません (GDRIVE_FOLDER_ID: ${folderId})。\n` +
                `   ID が正しいか確認してください。また、サービスアカウント\n` +
                `   (${serviceAccountEmail})\n` +
                `   がそのフォルダへのアクセス権を持っているか確認してください。`
            );
        } else if (code === 403) {
            console.error(
                `❌ フォルダへのアクセスが拒否されました (GDRIVE_FOLDER_ID: ${folderId})。\n` +
                `   サービスアカウント (${serviceAccountEmail}) を\n` +
                `   フォルダに共有するか、共有ドライブのメンバーとして追加してください。`
            );
        } else {
            console.error(`❌ フォルダ情報の取得に失敗しました: ${err.message}`);
        }
        process.exit(1);
    }

    const driveId = folderMeta.data.driveId;
    const isMyDrive = !driveId;
    const canAddChildren = folderMeta.data.capabilities?.canAddChildren;
    const folderName = folderMeta.data.name;

    if (isMyDrive) {
        // ─── マイドライブの場合 ───────────────────────────────────────────────────
        // サービスアカウントはストレージクォータを持たないため、マイドライブへの
        // 新規ファイル作成は必ず HTTP 403 (storageQuota) で失敗します。
        // 既存ファイルの上書き更新は可能なため、更新のみ試みます。
        console.warn(
            `⚠️  フォルダ "${folderName}" (ID: ${folderId}) はマイドライブのフォルダです。\n` +
            `   サービスアカウントはマイドライブへの新規ファイル作成ができません（storageQuota エラー）。\n` +
            `\n` +
            `   【よくある誤解】\n` +
            `   フォルダをサービスアカウントのメールに「共有」しても、\n` +
            `   そのフォルダはマイドライブのままです。\n` +
            `   「共有ドライブ」は Google Drive の別機能であり、\n` +
            `   フォルダの「共有」（閲覧・編集権限の付与）とは異なります。\n` +
            `\n` +
            `   【解決策：共有ドライブへ移行する手順】\n` +
            `     1. Google Drive で「+ 新規」→「共有ドライブ」を作成する\n` +
            `        ※ Google Workspace アカウントが必要です（無料の Gmail では作成不可）\n` +
            `        ※ 無料アカウントの場合は、他の Workspace ユーザーの共有ドライブに\n` +
            `           招待してもらってください\n` +
            `     2. 共有ドライブの「メンバーを管理」でサービスアカウントを追加する\n` +
            `        追加するメール : ${serviceAccountEmail}\n` +
            `        必要な役割     : 「コンテンツ管理者」または「管理者」\n` +
            `     3. 共有ドライブ内にフォルダを作成し、そのフォルダの ID を取得する\n` +
            `        （フォルダを右クリック →「リンクをコピー」の URL 末尾の英数字が ID）\n` +
            `     4. GitHub Secrets の GDRIVE_FOLDER_ID をその ID に更新する\n` +
            `\n` +
            `   現時点では既存ファイルの上書き更新のみ試みます。`
        );
    } else {
        // ─── 共有ドライブの場合 ──────────────────────────────────────────────────
        if (canAddChildren === false) {
            // capabilities.canAddChildren が false = このフォルダへの書き込み不可
            console.error(
                `❌ サービスアカウントは共有ドライブのフォルダ "${folderName}" に\n` +
                `   ファイルを作成する権限を持っていません。\n` +
                `   共有ドライブの「メンバーを管理」で以下を確認してください:\n` +
                `     対象メール : ${serviceAccountEmail}\n` +
                `     必要な役割 : 「コンテンツ管理者」または「管理者」\n` +
                `   現在の役割が「閲覧者」や「コメント投稿者」の場合はアップロードできません。`
            );
            process.exit(1);
        }
        console.log(`✅ フォルダ確認: "${folderName}" (共有ドライブ ID: ${driveId})`);
    }

    const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"));
    let hasError = false;

    for (const file of files) {
        const filePath = path.join(notesDir, file);

        try {
            // 既存ファイルを検索
            const escapedFile = file.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            const listParams = {
                q: `name='${escapedFile}' and '${folderId}' in parents and trashed=false`,
                fields: "files(id, name)",
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            };
            // 共有ドライブの場合はドライブ内に限定して検索
            if (!isMyDrive) {
                listParams.corpora = "drive";
                listParams.driveId = driveId;
            }
            const existing = await drive.files.list(listParams);

            if (existing.data.files.length > 0) {
                // 上書き更新（マイドライブ・共有ドライブともに可能）
                const fileId = existing.data.files[0].id;
                await drive.files.update({
                    fileId,
                    supportsAllDrives: true,
                    media: {
                        mimeType: "text/markdown",
                        body: fs.createReadStream(filePath),
                    },
                });
                console.log(`🔁 updated: ${file}`);
            } else if (isMyDrive) {
                // マイドライブへの新規作成は storageQuota エラーになるためスキップ
                console.warn(`⏭️  skipped (new file, My Drive): ${file}`);
                hasError = true;
            } else {
                // 共有ドライブへの新規アップロード
                await drive.files.create({
                    supportsAllDrives: true,
                    requestBody: {
                        name: file,
                        parents: [folderId],
                    },
                    media: {
                        mimeType: "text/markdown",
                        body: fs.createReadStream(filePath),
                    },
                });
                console.log(`✅ uploaded: ${file}`);
            }
        } catch (err) {
            const code = err.code ?? err.status;
            if (code === 403) {
                console.error(
                    `❌ skipped: ${file} (HTTP 403: ${err.message})\n` +
                    `   サービスアカウント (${serviceAccountEmail}) の権限を確認してください。`
                );
                hasError = true;
            } else {
                throw err;
            }
        }
    }

    if (hasError) {
        process.exit(1);
    }
}

uploadToDrive().catch((err) => {
    console.error(err);
    process.exit(1);
});
