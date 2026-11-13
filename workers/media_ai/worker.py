"""Worker entrypoint mirror — cho phép chạy `python -m media_ai.worker` theo README."""

from media_ai.jobs.worker import main

if __name__ == "__main__":
    main()
