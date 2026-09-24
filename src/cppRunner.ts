function cppRawStringLiteral(content: string) {
  let delimiter = 'oc_stdin'
  let counter = 0

  while (content.includes(`)${delimiter}"`)) {
    counter += 1
    delimiter = `oc_stdin_${counter}`
  }

  return `R"${delimiter}(${content})${delimiter}"`
}

/** Rename the user's entry point so our harness can own `main`. */
export function renameMainToUserMain(source: string) {
  return source.replace(/\bmain\s*\(/g, 'user_main(')
}

export function prepareCppCodeForRun(source: string, stdin: string) {
  const userCode = renameMainToUserMain(source)
  const inputLiteral = cppRawStringLiteral(stdin)

  const harness = `
int32_t main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    
    string input = ${inputLiteral};

    istringstream iss(input);
    cin.rdbuf(iss.rdbuf());

    return user_main();
}
`

  return `${userCode.trimEnd()}\n${harness}`
}
