# Tech Notes — 全メモ統合ファイル

> 生成日時: 2026-04-17 02:27:41 UTC  
> ファイル数: 5  
> このファイルは GitHub Actions により自動生成されます。

---

## MonoBehaviour 実装時の初歩的な注意点

---
    title: "MonoBehaviour 実装時の初歩的な注意点"
    id: "4"
    tags: ["Unity"]
    date: "2026-03-02"
    notion_id: "3178958f-aa24-806f-9e16-c214523aadad"
    ---

    
## 概要


パフォーマンス・メモリへの影響や、ユニットテストの書きにくさや密結合など引き起こす可能性があるため、ライフサイクルへの依存は極力減らすべきである。
適宜、ScriptableObjectや純粋なC#クラスに使い分けること。


## 環境

- OS : Windows11
- 環境 : Unity 6.3

## 内容


### <u>MonoBehaviourとは</u>


Unity の Script の基底クラスであり、`MonoBehabiour` を継承することで Unity のライフサイクルメソッド ( `Awake()`, `Start()`, `Update()` ) が使用できる。


```c#
public class PlayerController : MonoBehaviour
{
		void Awake() { }
		void Start() { }
		void Update() { }
}
```


> ⚠️ `MonoBehaviour` を継承したクラスは `new` でインスタンス化できないため、GameObject にコンポーネントとしてアタッチして使用する。


### <u>ライフサイクル</u>


<u>`Awake()`</u>


GameObject が Scene に読み込まれた瞬間に一度だけ呼ばれるメソッド。


```c#
void Awake()
{
		// 自分自身のコンポーネント取得や初期化
		_rigidbody = GetComponent<Rigidbody>();
}
```


| **使うべき場面**         | **使うべきでない場面**          |
| ------------------ | ---------------------- |
| 自分自身のコンポーネント取得・初期化 | 他オブジェクトへの参照（実行順が不定のため） |
| シングルトンの初期化         | `Start()` で十分な初期化処理    |


Script Execution Order（複数のスクリプト間での実行順序）


スクリプトごとの実行優先度を調整することで実行順をコントロールでき、数値が小さい（マイナス）ほど先に実行される。


> ❗ 設定のし過ぎに注意  
> - 基本的には「 Awake() で自分自身の初期化を行い、Start() で他者を参照する」というルールを徹底。  
>   
> - **どうしても解決できないクリティカルな初期化順（DIコンテナやログ基盤など）**にのみ、この設定を使う。


> 📝 Script Execution Order の主な特徴と機能 / 用途とメリット  
> - **設定場所：**Edit > Project Settings > Script Execution Order  
>   
> - **順序の制御：**画面上でスクリプトをドラッグ、または数値を編集し、実行の優先度を決定する。  
>   
> - **Default Time：**未指定のスクリプトはすべて「Default Time」として同じ順序（デフォルトでは 0 ）で処理される。  
>   
> - **初期化の順序：**シングルトンなど、他のコンポ―ネントが依存するスクリプトを先に初期化する等。  
>   
> - **フレームの管理：**描画処理の前にデータ更新を行うなど、特定順序でのフレーム処理の保証。  
>   
> - **注意点：**  
>   
> - **備考：**同様にスクリプトの実行順序を制御する機能に、コード上で指定できる「DefaultExecutionOrder」が存在する。


<u>`OnEnable()`</u>


GameObject がアクティブになる度に呼ばれ、`Awake()`, `Start()` とは異なり**複数回呼ばれる**メソッド。


```c#
void OnEnable()
{
		// イベントの購読登録
		EventManager.OnGameStart += HandleGameStart;
}

void OnDisable()
{
		// OnEnable で登録したものは必ずここ（OnDisable）で解除する
		EventManager.OnGameStart -= HandleGameStart;
}
```


| **使うべき場面**                | **使うべきでない場面**              |
| ------------------------- | -------------------------- |
| イベント・デリゲートの購読登録           | 一度だけ行いたい初期化（`Awake()` を使う） |
| Object Pool から再利用時のリセット処理 |                            |


> ❗ OnEnable() で登録したイベントは必ず OnDisable() で解除する。  
> 解除漏れはメモリリークや意図しない動作の原因になる


<u>`Start()`</u>


**全 Object の** **`Awake()`** **が完了した後**に、一度だけ呼ばれるメソッド。


```c#
void Start()
{
		// 他の Object への参照や依存関係の解決
		_enemy = FindObjectOfType<Enemy>();
}
```


| **使うべき場面**            | **使うべきでない場面**                 |
| --------------------- | ----------------------------- |
| 他 Object への参照取得       | 自分自身のコンポーネント取得（`Awake()` を使う） |
| Awake() 完了後に行いたい初期化処理 | 毎フレーム行う処理（`Update()` を使う）     |


> ⚠️ `Awake()` → `Start()` の使い分け  
> - 自分の初期化には `Awake()` を使用する。  
>   
> - 他 Object への依存解決には `Start()` を使用する。


`Update()`


**毎フレーム**呼ばれるメソッド。
フレームレートに依存するため、実行間隔は一定ではない。


```c#
void Update()
{
		// 入力検知・キャラクター移動など
		float move = Input.GetAxis("Horizontal")
		// Time.deltaTime を掛けることでフレームレートに関わらず、一定速度で移動できる（掛けない場合はフレームレートで速度が変わってしまう）
		transform.Translate(move * speed * Time.deltaTime, 0, 0);
}
```


| **使うべき場面** | **使うべきでない場面**             |
| ---------- | ------------------------- |
| ユーザー入力の検知  | 物理演算（`FixedUpdate()` を使う） |
| UI の更新     | カメラ追従（`LateUpdate()` を使う） |
| ゲームロジックの更新 | 重い処理・毎フレーム不要な処理           |


`LateUpdate()`


**全 Object の** **`Update()`** **が完了した後**に毎フレーム呼ばれるメソッド。


```c#
void LateUpdate()
{
		// カメラをプレイヤーに追従させる
		transform.position = _player.transform.position + _offset;
}
```


| **使うべきで場面**                  | **使うべきでない場面**             |
| ---------------------------- | ------------------------- |
| カメラ追従（キャラクターの移動後に位置を確定させるため） | 入力検知（`Update()` を使う）      |
| Update() 後に確定した情報を元にした処理     | 物理演算（`FixedUpdate()` を使う） |


`FixedUpdate()`


**物理演算エンジンと同じ固定間隔**（デフォルト0.02秒＝50回/秒）で呼ばれるメソッド。
**フレームレートに依存しない**。


```c#
void FixedUpdate()
{
		// 物理ベースの移動
		_rigidbody.AddForce(Vector3.forward * _speed);
}
```


| **使うべき場面**         | **使うべきでない場面**          |
| ------------------ | ---------------------- |
| Rigidbody を使った物理演算 | 入力検知（フレーム落ち時に入力を取りこぼす） |
| 一定間隔で行いたい処理        | UI の更新（`Update()` を使う） |


> ⚠️ FixedUpdate() 内での入力検知が非推奨  
> - フレームレートと物理更新の間隔がずれると入力を取りこぼすことがある。  
>   
> - 入力は `Update()` で受け取り、結果を `FixedUpdate()` で物理に反映する


`OnDisable()`


GameObject が**非アクティブ**になる度に呼ばれるメソッド。


```c#
void OnDisable()
{
		// OnEnable で登録したイベントの解除
		EventManager.OnGameStart -= HandleGameStart;
}
```


`OnDestroy()`


GameObject が**破棄**される直前に、一度だけ呼ばれるメソッド。


```c#
// GameObject.Destroy() で破棄された時
// Scene がアンロードされた時
void OnDestroy()
{
		// 外部リソースの開放・後片付け
		_texture.Release();
}
```


`Reset()`


エディタ上でコンポーネントをアタッチした瞬間や、インスペクターの「Reset」ボタンを押した時に呼ばれるメソッド。
エディタ作業を効率化することが可能。


```c#
void Reset()
{
		// アタッチした瞬間に自動でコンポーネントを探してセットしてくれる
		_rigidbody = GetComponent<Rigidbody>();
}
```


### パフォーマンス上の注意点


`Update()` を使いすぎない


MonoBehaviour を継承したスクリプトが 100個 あれば、`Update()` も毎フレーム100回呼ばれる。
**空の** **`Update()`** **でも数千個単位になると無視できない負荷となる場合がある**。


```c#
// NG：使わないライフサイクルを空で残さない
void Update() { }
```


毎フレーム実行が不要な処理は `Update()` に書かない


```c#
//NG：毎フレームコンポーネントを取得している
void Update()
{
		GetComponent<Rigidbody>().AddForce(Vector3.up);
}

// OK：Awake() で一度だけ取得してキャッシュする
private Rigidbody _rigidbody;

void Awake()
{
		_rigidbody = GetComponent<Rigidbody>();
}

void Update()
{
		_rigidbody.AddForce(Vector3.up);
}
```


`Awake()` / `Start()` ：参照取得はキャッシュする


`GetComponent()` や `FindObjectOfType()` はコストが高い。


必要以上に呼び出さないようにキャッシュしておく。


```c#
// NG：Update で毎フレーム取得
void Update()
{
		FindObjectOfType<GameManager>().AddScore(1);
}

//：Awake() / Start() で一度だけ取得してフィールドに保持

void Awake()
{
		_gameManager = FindObjectOfType<GameManager>();
}

void Update()
{
		_gameManager.AddScore(1);
}
```


> ⚠️ `findobjectoftype()` は全 Scene を走査するため特にコストが高い。  
> `Awake()` / `Start()` での使用も最小限にとどめ、多用する場合はシングルトンやDIで参照を渡す設計が望ましい。


`Update()` ：ガベレージコレクション（GC）を意識する


Update() 内での


## ハマったポイント


## 参考リンク


[https://zenn.dev/kti/articles/7e7e4c8dc702ac](https://zenn.dev/kti/articles/7e7e4c8dc702ac)

---

## コーディングにおける5W1H

---
    title: "コーディングにおける5W1H"
    id: "11"
    tags: []
    date: "2026-03-30"
    notion_id: "3338958f-aa24-8003-b250-eed3ab8c0ad1"
    ---

    
## 概要

- コードには How（どのように）
- テストコードには What（何を）
- コミットログにはWhy（なぜ）
- コードコメントには Why not（あえてやらなかったこと）

を書こうというお話。


## 内容


### <u>前提知識：5W1Hとは</u>


情報を正確に伝え、漏れなく整理するための6要素。
簡潔かつ具体的に要点を伝えるフレームワークとして活用されている。


5W1Hの構成要素と詳細

- When（いつ）：日時、期間、期限。
- Where（どこで）：場所、施設、現場、対象となるターゲット。
- Who（誰が）：担当者、関係者、主語、ターゲット。
- What（何を）：対象物、目的、議題、業務内容。
- Why（なぜ）：理由、目的、背景、原因。
- How（どのように）：手段、方法、手順、進め方。

## ハマったポイント


## 参考リンク


[https://zenn.dev/never_be_a_pm/articles/69d204df1a8c4a](https://zenn.dev/never_be_a_pm/articles/69d204df1a8c4a)

---

## テンプレート

---
    title: "テンプレート"
    id: "3"
    tags: []
    date: "2026-03-02"
    notion_id: "3178958f-aa24-80e3-a813-d6c4b0bb53cd"
    ---

    
## 概要


（何をしたか・何を学んだか一言で）


## 環境

- OS :
- バージョン :

## 内容


（手順・コードなど）


## ハマったポイント


## 参考リンク

---

## ライブ構築アイデア

---
    title: "ライブ構築アイデア"
    id: "8"
    tags: ["Unity"]
    date: "2026-03-16"
    notion_id: "3258958f-aa24-8041-936b-c2246fc9055a"
    ---

    
## アイデア

<details>
<summary>リアルタイム音声検知によるエフェクトの変化</summary>

スポットライトなど演出上のエフェクトの追加機能として、特定の音声(ボーカルなど)を検知し、そのボリュームの変動に応じてエフェクトの強弱を自動調整(もしくは切り替え)する機能


</details>

---

## 曖昧な理解を明確にする【メモリリーク】

---
    title: "曖昧な理解を明確にする【メモリリーク】"
    id: "10"
    tags: []
    date: "2026-03-23"
    notion_id: "32c8958f-aa24-80a9-914b-c8a6b30f4f76"
    ---

    
## 概要


（何をしたか・何を学んだか一言で）


## 環境

- OS :
- バージョン :

## 内容


（手順・コードなど）


## ハマったポイント


## 参考リンク
