# GRL Architecture

```text
WikiDocs / paper DB / code analyzer / another agent DB
                         |
                 adapter or native JSON
                         v
                    GRLContract v1
             +-----------+-----------+
             |           |           |
          React UI    standalone     CLI
                       web app    validate/inspect/
                                  convert/serve
```

The core owns only the portable contract, semantic validation, graph projection, and rendering. Producers remain in their source repositories. Adapters translate external snapshots without importing their source code. The web app is local-first and does not upload contracts.
