# Employee Tenure Visualizer

Small app that visualizes employee tenure based on JSON data (currently supports only Active Directory).

## Quick start

Serve the app via any HTTP server (`python -m http.server 8000`), then open it in a browser. Demo JSON data is included.

To acquire your own data from AD, run `.\Export-From-AD.ps1 "OU=Users1,DC=Company,DC=Com","OU=Users2,DC=Company,DC=Com"` in PowerShell to export data to a local JSON file.  
The data filename can be configured in `config.json`.

Local, offline, static, self-hosted. No clouds, no servers, no data leaks.

## Screenshots

By department
![demo-01](https://github.com/redmanmale/work-life/blob/master/images/demo-01.png)

Employee details
![demo-02](https://github.com/redmanmale/work-life/blob/master/images/demo-02.png)

Interesting stats
![demo-03](https://github.com/redmanmale/work-life/blob/master/images/demo-03.png)

## Credits

Inspired by and based on the [BugLife project](https://github.com/9-volt/bug-life).
