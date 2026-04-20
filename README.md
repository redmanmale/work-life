# Employee Tenure Visualizer

Local app that visualizes employees tenure based on json data (supported only Active Directory for now).

## Quick start

Just serve app via any HTTP server (`python -m http.server 8000`), than open in browser. Demo json data is included.

For acquiring your custom data from AD run `.\Export-From-AD.ps1 "OU=Users1,DC=Company,DC=Com","OU=Users2,DC=Company,DC=Com"` in Powershell to export data to a local json file. Than set its name in `config.json`.

by departments
![demo-01](https://github.com/redmanmale/work-life/blob/master/images/demo-01.png)

employee details
![demo-02](https://github.com/redmanmale/work-life/blob/master/images/demo-02.png)

interesting stats
![demo-02](https://github.com/redmanmale/work-life/blob/master/images/demo-03.png)

## Credits

Inspired by and based on [BugLife project](https://github.com/9-volt/bug-life).
