import { builtInGithubTemplates } from './githubTemplates.ts'
import type { EditorLanguage } from './storage.ts'
import { oneCompilerFileName } from './onecompiler.ts'
import type { Template } from './templates.ts'

const TEMPLATE_FILE_NAME: Partial<Record<EditorLanguage, string>> = {
  json: 'hello.json',
  html: 'index.html',
  css: 'style.css',
  markdown: 'hello.md',
  plaintext: 'hello.txt',
}

const HELLO_WORLD_SOURCE: Record<EditorLanguage, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  c: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,
  java: `public class Main {
    public static void main(String[] args) {
      System.out.println("Hello, World!");
    }
}
`,
  python: `print("Hello, World!")
`,
  javascript: `console.log("Hello, World!");
`,
  typescript: `console.log("Hello, World!");
`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
  rust: `fn main() {
    println!("Hello, World!");
}
`,
  json: `{
  "message": "Hello, World!"
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello</title>
  </head>
  <body>
    <p>Hello, World!</p>
  </body>
</html>
`,
  css: `body {
  font-family: system-ui, sans-serif;
  margin: 2rem;
}

body::before {
  content: "Hello, World!";
}
`,
  markdown: `# Hello, World!
`,
  plaintext: `Hello, World!
`,
}

function templateFileName(language: EditorLanguage) {
  return TEMPLATE_FILE_NAME[language] ?? oneCompilerFileName(language)
}

export function builtInHelloWorldTemplate(language: EditorLanguage): Template {
  return {
    id: `builtin-hello-${language}`,
    name: templateFileName(language),
    content: HELLO_WORLD_SOURCE[language],
    builtIn: true,
  }
}

export function builtInTemplatesForLanguage(language: EditorLanguage): Template[] {
  return [builtInHelloWorldTemplate(language), ...builtInGithubTemplates(language)]
}
