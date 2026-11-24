// The engine looks these elements up at import time; index.html provides them in the real app.
for (const id of ['gl', 'labels', 'app', 'fade']) {
  if (!document.getElementById(id)) { const el = document.createElement('div'); el.id = id; document.body.append(el); }
}
