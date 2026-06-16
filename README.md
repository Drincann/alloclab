# AllocLab

A small local web app for portfolio backtesting.

Chinese documentation: [README_zh.md](README_zh.md)

## Run

```bash
export ALLOCLAB_PORT=8765
# For cloud deploys: export ALLOCLAB_HOST=0.0.0.0
# Optional access control: export ALLOCLAB_ACCESS_KEY="your-key"
python server.py
```

Open:

```text
http://127.0.0.1:8765
```

## Notes

- Python 3.10+ is recommended.
- When `ALLOCLAB_ACCESS_KEY` is not set, API access is open for local use.
- `akshare` is optional and only needed for supported China fund data.
- Market data comes from external public sources and may be incomplete.

## License

WTFPL. See [LICENSE](LICENSE).
