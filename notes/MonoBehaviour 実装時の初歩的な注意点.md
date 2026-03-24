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


GameObject がアクティブになる度に呼ばれ、`Awake()`, `Start()` とは異なり**複数回呼ばれる**。


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


## ハマったポイント


## 参考リンク


[https://zenn.dev/kti/articles/7e7e4c8dc702ac](https://zenn.dev/kti/articles/7e7e4c8dc702ac)

