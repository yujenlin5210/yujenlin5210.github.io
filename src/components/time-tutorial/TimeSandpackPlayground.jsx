import { Sandpack } from '@codesandbox/sandpack-react';

export default function TimeSandpackPlayground({ files, mainFile = '/App.js' }) {
  return (
    <div className="w-full my-12 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 relative z-10">
      <Sandpack
        template="react"
        theme="dark"
        files={{
          '/styles.css': {
            code: `body {
  margin: 0;
  min-height: 100vh;
  background: #020617;
  color: white;
  font-family: Inter, system-ui, sans-serif;
}

button {
  font: inherit;
}

.app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}

.stage {
  width: min(98vw, 1280px);
  aspect-ratio: 16 / 10;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.32), transparent 34%),
    radial-gradient(circle at 72% 70%, rgba(14, 165, 233, 0.18), transparent 38%),
    #020617;
  overflow: hidden;
  position: relative;
}

svg {
  width: 100%;
  height: 100%;
  display: block;
  padding: 4px;
  box-sizing: border-box;
  transform: scale(1.45);
  transform-origin: center;
}

.toolbar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  pointer-events: none;
}

.toolbar > * {
  pointer-events: auto;
}

.count {
  color: rgba(226, 232, 240, 0.72);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.button {
  border: 1px solid rgba(165, 180, 252, 0.45);
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.16);
  color: #e0e7ff;
  cursor: pointer;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}`,
            hidden: true,
          },
          ...files,
        }}
        options={{
          showLineNumbers: true,
          showInlineErrors: true,
          editorHeight: 640,
          wrapContent: true,
          activeFile: mainFile,
        }}
        customSetup={{
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        }}
      />
    </div>
  );
}
