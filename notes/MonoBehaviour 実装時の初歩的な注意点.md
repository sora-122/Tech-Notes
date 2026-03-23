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


## ハマったポイント


## 参考リンク


[https://zenn.dev/kti/articles/7e7e4c8dc702ac](https://zenn.dev/kti/articles/7e7e4c8dc702ac)

