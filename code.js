// ==UserScript==
// @name         Add coverage to github diffs
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Side by side diffs will now show coverage from your code
// @author       You
// @match        https://github.com/*/*/pull/*/files
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const coveredKind = {
        'p': 'yellow',
        'c': 'green',
        'u': 'red',
        'unknown': 'unknown',
        'failed': 'failed'
    }

    const styleString = `
    .blob-coverage {
        max-width: 5px;
        width: 1%;
        line-height: 20px;
    }
    .blob-coverage-green {
        background-color: #5f5;
    }
    .blob-coverage-red {
        background-color: #f55;
    }
    .blob-coverage-yellow {
        background-color: #ff5;
    }
    .blob-coverage-unknown {
        background-color: #ddd;
    }
    .blob-coverage-failed {
        background-color: #933;
    }
    `;
            const styleTag = document.createElement('style');
            styleTag.innerHTML = styleString

            document.body.append(styleTag);
    const parts = window.location.pathname.split('/')
    console.log(parts);
    const coverageHost = 'http://localhost:3000'

    fetch(`${coverageHost}/api/group/${parts[1]}/project/${parts[2]}/pullrequest/${parts[4]}/github-coverage`).then(async result => {
        const data = await result.json()
        let lastFileCount = 0;
        const updateFiles = (files) => {
            [...files].forEach(file => {
                const filePath = file.dataset['tagsearchPath']

                const diffLoadContainer = file.getElementsByClassName('js-diff-load-container')
                if (diffLoadContainer.length > 0) return;

                const colGroup = file.getElementsByTagName('colgroup');
                if (colGroup[0].children.length > 4) return;

                console.log("adding coverage to "+filePath)
                colGroup[0].innerHTML = `<col width="40" /><col width="5" /><col /><col width="40" /><col width="5" /><col />`;


                const expandableLines = file.getElementsByClassName('js-expandable-line');
                [...expandableLines].forEach(line => {
                    line.childNodes[3].colSpan = 5;
                });

                const allLineNumbers = file.getElementsByClassName('blob-code');
                [...allLineNumbers].filter(ln => ln.colSpan <= 1).forEach(ln => {
                    const lineNr = ln.parentElement.children[0].dataset['lineNumber']

                    const node = document.createElement('td')
                    const kind = ln.dataset['splitSide'] === 'left' ? 'base' : 'head';
                    const sideData = data[kind]
                    const fileData = sideData ? sideData[filePath] : undefined
                    const lineData = fileData ? fileData[lineNr] : undefined
                    const covered = lineData ? coveredKind[lineData] : data[kind+'Status'] === 'FAILED' ? coveredKind['failed'] : coveredKind['unknown']
                    node.className = ln.className.includes('blob-code-empty') ? 'blob-coverage' : `blob-coverage blob-coverage-${covered}`;
                    ln.parentElement.insertBefore(node, ln)
                })
            });
        }
        const files = document.getElementsByClassName('file');
        updateFiles(files)
        lastFileCount = files.length

        setInterval(() => {
            const files = document.getElementsByClassName('file');
            if (files.length !== lastFileCount) {
                try {
                    updateFiles(files);
                } catch(error) {
                    console.error(error)
                }
                lastFileCount = files.length;
            }
        }, 3000);
    });
    // Your code here...
})();
