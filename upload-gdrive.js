const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

async function uploadToDrive() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.GDRIVE_FOLDER_ID;
    const notesDir = "notes";

    // フォルダが共有ドライブ内かを確認する
    const folderMeta = await drive.files.get({
        fileId: folderId,
        supportsAllDrives: true,
        fields: "id,driveId",
    });
    const driveId = folderMeta.data.driveId;
    const isMyDrive = !driveId;

    if (isMyDrive) {
        // マイドライブの場合: サービスアカウントはファイル作成不可（403 storageQuota）
        // 既存ファイルの更新は可能なため、更新のみ試みて新規作成はスキップする。
        // 根本的な解決策は共有ドライブへの移行（下記参照）。
        console.warn(
            `⚠️  GDRIVE_FOLDER_ID (${folderId}) はマイドライブのフォルダです。\n` +
            `   サービスアカウントはマイドライブへの新規ファイル作成ができません。\n` +
            `   【推奨】以下の手順で共有ドライブに移行してください:\n` +
            `     1. Google Drive で「共有ドライブ」を作成する\n` +
            `     2. サービスアカウントのメールアドレスを共有ドライブのメンバーとして追加する\n` +
            `     3. 共有ドライブ内にフォルダを作成し、その ID を GDRIVE_FOLDER_ID に設定する\n` +
            `   既存ファイルの上書き更新のみ試みます。`
        );
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
            } else {
                // 新規アップロード（マイドライブでは 403 になる場合がある）
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
            if (err.code === 403 || err.status === 403) {
                console.warn(
                    `⚠️  skipped: ${file} (Error ${err.code ?? err.status}: ${err.message})\n` +
                    `   共有ドライブへの移行が必要です。`
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
