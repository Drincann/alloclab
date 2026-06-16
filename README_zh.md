# AllocLab

一个本地运行的组合回测 Web App。

## 运行

```bash
export ALLOCLAB_PORT=8765
# 云部署时：export ALLOCLAB_HOST=0.0.0.0
# 可选访问控制：export ALLOCLAB_ACCESS_KEY="your-key"
python server.py
```

打开：

```text
http://127.0.0.1:8765
```

## 说明

- 建议使用 Python 3.10 或更新版本。
- 未设置 `ALLOCLAB_ACCESS_KEY` 时，API 会直接放行，适合本地使用。
- `akshare` 是可选依赖，仅用于支持的中国基金数据。
- 行情数据来自外部公开数据源，可能不完整。

## License

WTFPL。见 [LICENSE](LICENSE)。
