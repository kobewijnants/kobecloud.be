# kobecloud.be

My personal site, built to look and behave like a terminal.

On load it types out `whoami`, `ls -l ~/projects`, `neofetch` and `cat contact.txt`. Press any key (or tap) to skip. After that the prompt is live: try `help`.

- Tab completion, ↑/↓ history, `Ctrl+L` to clear
- Section tabs along the top, tap buttons on mobile
- Light and dark theme (`theme`, or the button in the title bar)
- A few commands that aren't in `help`

## Stack

Plain HTML, CSS and JavaScript. No build step, no dependencies.

```
index.html   page shell + no-JS fallback
style.css    terminal look, both themes
main.js      boot animation, commands, prompt
404.html     not-found page
```

Run it locally with any static server:

```bash
python3 -m http.server 8000
```

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/pages.yml`. The `CNAME` file points it at `kobecloud.be`.

DNS for the apex domain:

| Type  | Name | Value                   |
|-------|------|-------------------------|
| A     | @    | 185.199.108.153         |
| A     | @    | 185.199.109.153         |
| A     | @    | 185.199.110.153         |
| A     | @    | 185.199.111.153         |
| CNAME | www  | kobewijnants.github.io  |

## License

[MIT](LICENSE)
