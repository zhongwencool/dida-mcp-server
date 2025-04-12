# Dida365 Open API Documentation

## Introduction
Welcome to the Dida365 Open API documentation. Dida365 is a powerful task management application that allows users to easily manage and organize their daily tasks, deadlines, and projects. With Dida365 Open API, developers can integrate Dida365's powerful task management features into their own applications and create a seamless user experience.

## Getting Started
To get started using the Dida365 Open API, you will need to register your application and obtain a client ID and client secret. You can register your application by visiting the Dida365 Developer Center. Once registered, you will receive a client ID and client secret which you will use to authenticate your requests.


## Authorization
### Get Access Token
In order to call Dida365's Open API, it is necessary to obtain an access token for the corresponding user. Dida365 uses the OAuth2 protocol to obtain the access token.

### First Step
Redirect the user to the Dida365 authorization page, https://dida365.com/oauth/authorize. The required parameters are as follows:

| Name | Description |
|------|-------------|
| client_id | Application unique id |
| scope | Spaces-separated permission scope. The currently available scopes are tasks:write tasks:read |
| state | Passed to redirect url as is |
| redirect_uri | User-configured redirect url |
| response_type | Fixed as code |

Example:
https://dida365.com/oauth/authorize?scope=scope&client_id=client_id&state=state&redirect_uri=redirect_uri&response_type=code

### Second Step
After the user grants access, Dida365 will redirect the user back to your application's redirect_uri with an authorization code as a query parameter.

| Name | Description |
|------|-------------|
| code | Authorization code for subsequent access tokens |
| state | state parameter passed in the first step |

### Third Step
To exchange the authorization code for an access token, make a POST request to https://dida365.com/oauth/token with the following parameters(Content-Type: application/x-www-form-urlencoded):

| Name | Description |
|------|-------------|
| client_id | The username is located in the HEADER using the Basic Auth authentication method |
| client_secret | The password is located in the HEADER using the Basic Auth authentication method |
| code | The code obtained in the second step |
| grant_type | grant type, now only authorization_code |
| scope | spaces-separated permission scope. The currently available scopes are tasks: write, tasks: read |
| redirect_uri | user-configured redirect url |

Access_token for openapi request authentication in the request response
 ```
  {  
...  
"access_token": "access token value"  
...  
}  
 ```
### Request OpenAPI
Set Authorization in the header, the value is Bearer access token value 

```
Authorization: Bearer e*****b
```
### API Reference
The Dida365 Open API provides a RESTful interface for accessing and managing user tasks, lists, and other related resources. The API is based on the standard HTTP protocol and supports JSON data formats.

## Task
### Get Task By Project ID And Task ID
```
GET /open/v1/project/{projectId}/task/{taskId}  
```
| Type | Name | Description | Schema |
|------|------|-------------|--------|
| Path | projectId (required) | Project identifier | string |
| Path | taskId (required) | Task identifier | string |

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Task |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request
```
GET /open/v1/project/{{projectId}}/task/{{taskId}} HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```
##### Response
```json
{  
"id" : "63b7bebb91c0a5474805fcd4",  
"isAllDay" : true,  
"projectId" : "6226ff9877acee87727f6bca",  
"title" : "Task Title",  
"content" : "Task Content",  
"desc" : "Task Description",  
"timeZone" : "America/Los_Angeles",  
"repeatFlag" : "RRULE:FREQ=DAILY;INTERVAL=1",  
"startDate" : "2019-11-13T03:00:00+0000",  
"dueDate" : "2019-11-14T03:00:00+0000",  
"reminders" : [ "TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S" ],  
"priority" : 1,  
"status" : 0,  
"completedTime" : "2019-11-13T03:00:00+0000",  
"sortOrder" : 12345,  
"items" : [ {  
    "id" : "6435074647fd2e6387145f20",  
    "status" : 0,  
    "title" : "Item Title",  
    "sortOrder" : 12345,  
    "startDate" : "2019-11-13T03:00:00+0000",  
    "isAllDay" : false,  
    "timeZone" : "America/Los_Angeles",  
    "completedTime" : "2019-11-13T03:00:00+0000"  
    } ]  
}  
```
### Create Task
```
POST /open/v1/task  
```
#### Parameters

| Type | Name | Description | Schema |
|------|------|-------------|--------|
| Body | title (required) | Task title | string |
| Body | content | Task content | string |
| Body | desc | Description of checklist | string |
| Body | tags | Task tags | < string > array |
| Body | isAllDay | All day | boolean |
| Body | startDate | Start date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format. Example : "2019-11-13T03:00:00+0000" | date |
| Body | dueDate | Due date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format. Example : "2019-11-13T03:00:00+0000" | date |
| Body | timeZone | The time zone in which the time is specified | String |
| Body | reminders | Lists of reminders specific to the task | list |
| Body | repeatFlag | Recurring rules of task | string |
| Body | priority | The priority of task, default is "0" | integer |
| Body | sortOrder | The order of task | integer |
| Body | items | The list of subtasks | list |
| Body | items.title | Subtask title | string |
| Body | items.startDate | Start date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format | date |
| Body | items.isAllDay | All day | boolean |
| Body | items.sortOrder | The order of subtask | integer |
| Body | items.timeZone | The time zone in which the Start time is specified | string |
| Body | items.status | The completion status of subtask | integer |
| Body | items.completedTime | Completed time in "yyyy-MM-dd'T'HH:mm:ssZ" format. Example : "2019-11-13T03:00:00+0000" | date |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Task |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
POST /open/v1/task HTTP/1.1
Host: api.dida365.com
Content-Type: application/json
Authorization: Bearer {{token}}

{
    ...
    "title": "Task Title",
    "projectId": "6226ff9877acee87727f6bca"
    ...
}
```

##### Response

```json
{
  "id": "63b7bebb91c0a5474805fcd4",
  "projectId": "6226ff9877acee87727f6bca",
  "title": "Task Title",
  "content": "Task Content",
  "desc": "Task Description",
  "isAllDay": true,
  "startDate": "2019-11-13T03:00:00+0000",
  "dueDate": "2019-11-14T03:00:00+0000",
  "timeZone": "America/Los_Angeles",
  "reminders": ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"],
  "repeatFlag": "RRULE:FREQ=DAILY;INTERVAL=1",
  "priority": 1,
  "status": 0,
  "completedTime": "2019-11-13T03:00:00+0000",
  "sortOrder": 12345,
  "items": [
    {
      "id": "6435074647fd2e6387145f20",
      "status": 1,
      "title": "Subtask Title",
      "sortOrder": 12345,
      "startDate": "2019-11-13T03:00:00+0000",
      "isAllDay": false,
      "timeZone": "America/Los_Angeles",
      "completedTime": "2019-11-13T03:00:00+0000"
    }
  ]
}
```

### Update Task

```http
POST /open/v1/task/{taskId}
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | taskId | Task identifier | string | Yes |
| Body | id | Task id | string | Yes |
| Body | projectId | Project id | string | Yes |
| Body | title | Task title | string | No |
| Body | content | Task content | string | No |
| Body | desc | Description of checklist | string | No |
| Body | isAllDay | All day | boolean | No |
| Body | startDate | Start date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format | date | No |
| Body | dueDate | Due date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format | date | No |
| Body | timeZone | The time zone in which the time is specified | string | No |
| Body | reminders | Lists of reminders specific to the task | list | No |
| Body | repeatFlag | Recurring rules of task | string | No |
| Body | priority | The priority of task, default is "normal" | integer | No |
| Body | sortOrder | The order of task | integer | No |
| Body | items | The list of subtasks | list | No |
| Body | items.title | Subtask title | string | No |
| Body | items.startDate | Start date and time in "yyyy-MM-dd'T'HH:mm:ssZ" format | date | No |
| Body | items.isAllDay | All day | boolean | No |
| Body | items.sortOrder | The order of subtask | integer | No |
| Body | items.timeZone | The time zone in which the Start time is specified | string | No |
| Body | items.status | The completion status of subtask | integer | No |
| Body | items.completedTime | Completed time in "yyyy-MM-dd'T'HH:mm:ssZ" format | date | No |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Task |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
POST /open/v1/task/{{taskId}} HTTP/1.1
Host: api.dida365.com
Content-Type: application/json
Authorization: Bearer {{token}}

{
    "id": "{{taskId}}",
    "projectId": "{{projectId}}",
    "title": "Task Title",
    "priority": 1,
    ...
}
```

##### Response

```json
{
  "id": "63b7bebb91c0a5474805fcd4",
  "projectId": "6226ff9877acee87727f6bca",
  "title": "Task Title",
  "content": "Task Content",
  "desc": "Task Description",
  "isAllDay": true,
  "startDate": "2019-11-13T03:00:00+0000",
  "dueDate": "2019-11-14T03:00:00+0000",
  "timeZone": "America/Los_Angeles",
  "reminders": ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"],
  "repeatFlag": "RRULE:FREQ=DAILY;INTERVAL=1",
  "priority": 1,
  "status": 0,
  "completedTime": "2019-11-13T03:00:00+0000",
  "sortOrder": 12345,
  "items": [
    {
      "id": "6435074647fd2e6387145f20",
      "status": 1,
      "title": "Item Title",
      "sortOrder": 12345,
      "startDate": "2019-11-13T03:00:00+0000",
      "isAllDay": false,
      "timeZone": "America/Los_Angeles",
      "completedTime": "2019-11-13T03:00:00+0000"
    }
  ]
}
```

### Complete Task

```http
POST /open/v1/project/{projectId}/task/{taskId}/complete
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | projectId | Project identifier | string | Yes |
| Path | taskId | Task identifier | string | Yes |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | No Content |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
POST /open/v1/project/{{projectId}}/task/{{taskId}}/complete HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

### Delete Task

```http
DELETE /open/v1/project/{projectId}/task/{taskId}
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | projectId | Project identifier | string | Yes |
| Path | taskId | Task identifier | string | Yes |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | No Content |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
DELETE /open/v1/project/{{projectId}}/task/{{taskId}} HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

## Project

### Get User Project

```http
GET /open/v1/project
```

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | < Project > array |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
GET /open/v1/project HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

##### Response

```json
[
  {
    "id": "6226ff9877acee87727f6bca",
    "name": "project name",
    "color": "#F18181",
    "closed": false,
    "groupId": "6436176a47fd2e05f26ef56e",
    "viewMode": "list",
    "permission": "write",
    "kind": "TASK"
  }
]
```

### Get Project By ID

```http
GET /open/v1/project/{projectId}
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | project | Project identifier | string | Yes |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Project |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
GET /open/v1/project/{{projectId}} HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

##### Response

```json
{
  "id": "6226ff9877acee87727f6bca",
  "name": "project name",
  "color": "#F18181",
  "closed": false,
  "groupId": "6436176a47fd2e05f26ef56e",
  "viewMode": "list",
  "kind": "TASK"
}
```

### Get Project With Data

```http
GET /open/v1/project/{projectId}/data
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | projectId | Project identifier | string | Yes |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | ProjectData |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
GET /open/v1/project/{{projectId}}/data HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

##### Response

```json
{
  "project": {
    "id": "6226ff9877acee87727f6bca",
    "name": "project name",
    "color": "#F18181",
    "closed": false,
    "groupId": "6436176a47fd2e05f26ef56e",
    "viewMode": "list",
    "kind": "TASK"
  },
  "tasks": [
    {
      "id": "6247ee29630c800f064fd145",
      "isAllDay": true,
      "projectId": "6226ff9877acee87727f6bca",
      "title": "Task Title",
      "content": "Task Content",
      "desc": "Task Description",
      "timeZone": "America/Los_Angeles",
      "repeatFlag": "RRULE:FREQ=DAILY;INTERVAL=1",
      "startDate": "2019-11-13T03:00:00+0000",
      "dueDate": "2019-11-14T03:00:00+0000",
      "reminders": [
        "TRIGGER:P0DT9H0M0S",
        "TRIGGER:PT0S"
      ],
      "priority": 1,
      "status": 0,
      "completedTime": "2019-11-13T03:00:00+0000",
      "sortOrder": 12345,
      "items": [
        {
          "id": "6435074647fd2e6387145f20",
          "status": 0,
          "title": "Subtask Title",
          "sortOrder": 12345,
          "startDate": "2019-11-13T03:00:00+0000",
          "isAllDay": false,
          "timeZone": "America/Los_Angeles",
          "completedTime": "2019-11-13T03:00:00+0000"
        }
      ]
    }
  ],
  "columns": [
    {
      "id": "6226ff9e76e5fc39f2862d1b",
      "projectId": "6226ff9877acee87727f6bca",
      "name": "Column Name",
      "sortOrder": 0
    }
  ]
}
```
### Create Project

```http
POST /open/v1/project
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Body | name | Name of the project | string | Yes |
| Body | color | Color of project, e.g. "#F18181" | string | No |
| Body | sortOrder | Sort order value of the project | integer (int64) | No |
| Body | viewMode | View mode, "list", "kanban", "timeline" | string | No |
| Body | kind | Project kind, "TASK", "NOTE" | string | No |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Project |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
POST /open/v1/project HTTP/1.1
Host: api.dida365.com
Content-Type: application/json
Authorization: Bearer {{token}}

{
    "name": "project name",
    "color": "#F18181",
    "viewMode": "list",
    "kind": "task"
}
```

##### Response

```json
{
  "id": "6226ff9877acee87727f6bca",
  "name": "project name",
  "color": "#F18181",
  "sortOrder": 0,
  "viewMode": "list",
  "kind": "TASK"
}
```

### Update Project

```http
POST /open/v1/project/{projectId}
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | projectId | Project identifier | string | Yes |
| Body | name | Name of the project | string | No |
| Body | color | Color of the project | string | No |
| Body | sortOrder | Sort order value, default 0 | integer (int64) | No |
| Body | viewMode | View mode, "list", "kanban", "timeline" | string | No |
| Body | kind | Project kind, "TASK", "NOTE" | string | No |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | Project |
| 201 | Created | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
POST /open/v1/project/{{projectId}} HTTP/1.1
Host: api.dida365.com
Content-Type: application/json
Authorization: Bearer {{token}}

{
    "name": "Project Name",
    "color": "#F18181",
    "viewMode": "list",
    "kind": "TASK"
}
```

##### Response

```json
{
  "id": "6226ff9877acee87727f6bca",
  "name": "Project Name",
  "color": "#F18181",
  "sortOrder": 0,
  "viewMode": "list",
  "kind": "TASK"
}
```

### Delete Project

```http
DELETE /open/v1/project/{projectId}
```

#### Parameters

| Type | Name | Description | Schema | Required |
|------|------|-------------|--------|----------|
| Path | projectId | Project identifier | string | Yes |

#### Responses

| HTTP Code | Description | Schema |
|-----------|-------------|--------|
| 200 | OK | No Content |
| 401 | Unauthorized | No Content |
| 403 | Forbidden | No Content |
| 404 | Not Found | No Content |

#### Example

##### Request

```http
DELETE /open/v1/project/{{projectId}} HTTP/1.1
Host: api.dida365.com
Authorization: Bearer {{token}}
```

## Definitions

### ChecklistItem

| Name | Description | Schema |
|------|-------------|--------|
| id | Subtask identifier | string |
| title | Subtask title | string |
| status | The completion status of subtask (Normal: 0, Completed: 1) | integer (int32) |
| completedTime | Subtask completed time in "yyyy-MM-dd'T'HH:mm:ssZ" (e.g. "2019-11-13T03:00:00+0000") | string (date-time) |
| isAllDay | All day | boolean |
| sortOrder | Subtask sort order (e.g. 234444) | integer (int64) |
| startDate | Subtask start date time in "yyyy-MM-dd'T'HH:mm:ssZ" (e.g. "2019-11-13T03:00:00+0000") | string (date-time) |
| timeZone | Subtask timezone (e.g. "America/Los_Angeles") | string |

### Task

| Name | Description | Schema |
|------|-------------|--------|
| id | Task identifier | string |
| projectId | Task project id | string |
| title | Task title | string |
| isAllDay | All day | boolean |
| completedTime | Task completed time in "yyyy-MM-dd'T'HH:mm:ssZ" (Example: "2019-11-13T03:00:00+0000") | string (date-time) |
| content | Task content | string |
| desc | Task description of checklist | string |
| dueDate | Task due date time in "yyyy-MM-dd'T'HH:mm:ssZ" (Example: "2019-11-13T03:00:00+0000") | string (date-time) |
| items | Subtasks of Task | < ChecklistItem > array |
| priority | Task priority (Value: None:0, Low:1, Medium:3, High:5) | integer (int32) |
| reminders | List of reminder triggers (Example: [ "TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S" ]) | < string > array |
| repeatFlag | Recurring rules of task (Example: "RRULE:FREQ=DAILY;INTERVAL=1") | string |
| sortOrder | Task sort order (Example: 12345) | integer (int64) |
| startDate | Start date time in "yyyy-MM-dd'T'HH:mm:ssZ" (Example: "2019-11-13T03:00:00+0000") | string (date-time) |
| status | Task completion status (Value: Normal: 0, Completed: 2) | integer (int32) |
| timeZone | Task timezone (Example: "America/Los_Angeles") | string |

### Project

| Name | Description | Schema |
|------|-------------|--------|
| id | Project identifier | string |
| name | Project name | string |
| color | Project color | string |
| sortOrder | Order value | integer (int64) |
| closed | Project closed | boolean |
| groupId | Project group identifier | string |
| viewMode | View mode ("list", "kanban", "timeline") | string |
| permission | "read", "write" or "comment" | string |
| kind | "TASK" or "NOTE" | string |

### Column

| Name | Description | Schema |
|------|-------------|--------|
| id | Column identifier | string |
| projectId | Project identifier | string |
| name | Column name | string |
| sortOrder | Order value | integer (int64) |

### ProjectData

| Name | Description | Schema |
|------|-------------|--------|
| project | Project info | Project |
| tasks | Undone tasks under project | <Task> array |
| columns | Columns under project | <Column> array |

## Feedback and Support

If you have any questions or feedback regarding the Dida365 Open API documentation, please contact us at support@dida365.com. We appreciate your input and will work to address any concerns or issues as quickly as possible. Thank you for choosing Dida!
