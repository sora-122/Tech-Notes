const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function exportNotes() {
    // データベースからページ一覧を取得
    const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
    });

    // notes フォルダを作成
    if (!fs.existsSync("notes")) fs.mkdirSync("notes");

    for (const page of response.results) {
        // タイトルを取得
        const titleProp =
            page.properties["名前"] ||
            page.properties["Title"] ||
            page.properties["title"] ||
            Object.values(page.properties).find((p) => p.type == "title");
        
        const title = titleProp?.title?.[0]?.plain_text || "untitled";
        const safeTitle = title.replace(/[/\\?%*:|"<>]/g, "-");

        // IDを取得（unique_idタイプのプロパティ）
        const uniqueIdProp =
            page.properties["ID"] ||
            Object.values(page.properties).find((p) => p.type === "unique_id");
        const uniqueIdNumber = uniqueIdProp?.unique_id?.number ?? null;
        const uniqueIdPrefix = uniqueIdProp?.unique_id?.prefix ?? null;
        const uniqueId = uniqueIdNumber !== null
            ? (uniqueIdPrefix ? `${uniqueIdPrefix}-${uniqueIdNumber}` : String(uniqueIdNumber))
            : null;
        const uniqueIdValue = uniqueId !== null ? `"${uniqueId}"` : "null";

        // タグを取得
        const tags =
            page.properties.Note_Tag?.multi_select?.map(t => t.name) || [];

        // Markdown に変換
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const mdString = n2m.toMarkdownString(mdBlocks);

        // フロントマター付きで保存
        const content = `---
    title: "${title}"
    id: ${uniqueIdValue}
    tags: [${tags.map(t => `"${t}"`).join(", ")}]
    date: "${new Date(page.created_time).toISOString().split("T")[0]}"
    notion_id: "${page.id}"
    ---

    ${mdString.parent}`;

        fs.writeFileSync(
            path.join("notes", `${safeTitle}.md`),
            content,
            "utf-8"
        );
        console.log(`✅ exported: ${title}`);
    }
}

exportNotes().catch(console.error);