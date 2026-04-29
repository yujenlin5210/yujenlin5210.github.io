import { Sandpack } from '@codesandbox/sandpack-react';

export default function SandpackPlayground({ files, mainFile = '/App.js' }) {
  return (
    <div className="w-full my-12 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 relative z-10">
      <Sandpack
        template="react"
        theme="dark"
        files={{
          "/styles.css": {
            code: `body { margin: 0; padding: 0; background: #000; overflow: hidden; }
canvas { display: block; width: 100vw; height: 100vh; object-fit: cover; outline: none; }`,
            hidden: true
          },
          ...files
        }}
        options={{
          showLineNumbers: true,
          showInlineErrors: true,
          editorHeight: 500,
          wrapContent: true,
          activeFile: mainFile,
        }}
        customSetup={{
          dependencies: {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
          }
        }}
      />
    </div>
  );
}
