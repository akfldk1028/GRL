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

The core owns the portable contract, semantic validation, UI-independent node/edge projection, filtering, neighborhood queries, and adapters. React renders the projected graph but does not own graph semantics. Producers remain in their source repositories. The web app is local-first and does not upload contracts.
