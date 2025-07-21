## Counter Schema

```sql
CREATE TABLE counter (
    ip text,        -- IP of device that submitted the request. Collected in case multiple users log in with the same credentials, and data needs to be separated afterwards
    username text,  -- account that submitted the data point
    user_submitted_time timestamp, -- the time of the click as measured by the user
    server_submission_time timestamp DEFAULT current_timestamp, -- the time that the server received the request and added it to the db
	deleted boolean DEFAULT false  -- whether or not this value has been "deleted" by an undo action and should not be sent back to users
);

GRANT ALL PRIVILEGES ON counter TO service_account;
```
