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
    // サービスアカウントはマイドライブへのファイル作成が不可（403 storageQuota）のため、
    // 共有ドライブのフォルダである必要がある
    const folderMeta = await drive.files.get({
        fileId: folderId,
        supportsAllDrives: true,
        fields: "id,driveId",
    });
    const driveId = folderMeta.data.driveId;
    if (!driveId) {
        throw new Error(
            `GDRIVE_FOLDER_ID (${folderId}) はマイドライブのフォルダです。` +
            `サービスアカウントはマイドライブへのファイル作成ができません。` +
            `GDRIVE_FOLDER_ID を共有ドライブ内のフォルダに変更してください。`
        );
    }

    const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
        const filePath = path.join(notesDir, file);

        // 既存ファイルを検索（共有ドライブ内に限定して検索）
        const escapedFile = file.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const existing = await drive.files.list({
            q: `name='${escapedFile}' and '${folderId}' in parents and trashed=false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: "drive",
            driveId,
        });

        if (existing.data.files.length > 0) {
            // 上書き更新
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
            // 新規アップロード
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
    }
}

uploadToDrive().catch((err) => {
    console.error(err);
    process.exit(1);
});
