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

    const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
        const filePath = path.join(notesDir, file);

        // 既存ファイルを検索
        const existing = await drive.files.list({
            q: `name='${file}' and '${folderId}' in parents and trashed=false`,
            fields: "files(id, name)",
        });

        if (existing.data.files.length > 0) {
            // 上書き更新
            const fileId = existing.data.files[0].id;
            await drive.files.update({
                fileId,
                media: {
                    mimeType: "text/markdown",
                    body: fs.createReadStream(filePath),
                },
            });
            console.log(`🔁 updated: ${file}`);
        } else {
            // 新規アップロード
            await drive.files.create({
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

uploadToDrive().catch(console.error);
