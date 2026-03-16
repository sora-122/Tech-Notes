const fs = require("fs");
const path = require("path");

const notesDir = "notes";
const outputFile = "notes-combined.md";

function generateCombined() {
    if (!fs.existsSync(notesDir)) {
        console.error(`❌ ノートディレクトリが見つかりません: ${notesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(notesDir)
        .filter((f) => f.endsWith(".md"))
        .sort();

    if (files.length === 0) {
        console.warn("⚠️  notes/ ディレクトリに .md ファイルが見つかりませんでした。");
        process.exit(0);
    }

    const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    const sections = files.map((file) => {
        const filePath = path.join(notesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        // ファイル名（拡張子なし）をセクション見出しとして追加
        const noteName = file.replace(/\.md$/, "");
        return `## ${noteName}\n\n${content.trim()}`;
    });

    const combined =
        `# Tech Notes — 全メモ統合ファイル\n\n` +
        `> 生成日時: ${generatedAt}  \n` +
        `> ファイル数: ${files.length}  \n` +
        `> このファイルは GitHub Actions により自動生成されます。\n\n` +
        `---\n\n` +
        sections.join("\n\n---\n\n") +
        `\n`;

    fs.writeFileSync(outputFile, combined, "utf-8");
    console.log(`✅ ${files.length} 件のメモを ${outputFile} に統合しました。`);
    // GITHUB_REPOSITORY は GitHub Actions 実行時に自動設定される (例: sora-122/Tech-Notes)
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) {
        console.warn(`⚠️  GITHUB_REPOSITORY が未設定です。GitHub Actions 外で実行している場合は`);
        console.warn(`   環境変数 GITHUB_REPOSITORY=<owner>/<repo> を指定してください。`);
    } else {
        const url = `https://raw.githubusercontent.com/${repo}/main/${outputFile}`;
        console.log(`\n📎 NotebookLM 連携 URL (初回のみ登録してください):`);
        console.log(`   ${url}`);
        console.log(`   ※ URL は変わりません。GitHub Actions の自動実行により内容が更新されるため、`);
        console.log(`   ※ 一度登録すれば NotebookLM のソースは自動的に最新化されます。`);
    }
}

generateCombined();
