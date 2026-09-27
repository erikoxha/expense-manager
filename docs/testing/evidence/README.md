# Reviewed local evidence

See ../RESULTS.md for execution scope and limitations. JSON files preserve the original scanner findings including the triaged high alert. Backend-final.txt is the final pytest run; logout-regression-before.txt is the earlier targeted failing run, whose low coverage is expected for a two-test selection. The source manifest records the working tree rather than pretending the base commit contains uncommitted tests.

Synthetic scanner payloads and local endpoint URLs are intentional. No authentication tokens or private environment files are included. Local absolute workspace paths in console evidence were normalized to <repository>. Full HTML reports are available in the separate local report archive; remote CI has not executed yet.
