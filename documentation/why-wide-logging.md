---
outline: deep
---

# Why Wide Logging?

Good question. Although you might even be wondering: what is wide logging? Wide logging refers to the practice of using one, single log per an event that happens in your system that includes all information that happened during that event. As an example, many apps have logging that looks like this:

```ts
function register(user: User) {
  console.log("Creating account for", user);

  try {
    const exists = await check_user_exists(user);

    if (!exists) {
      const create_user = await create_user(user);
      console.info("User created successfully", create_user.id, new Date());
    } else {
      console.warn("User already exists", user);
      throw new Error("User already exists");
    }
  } catch (error) {
    console.error("Error creating user", { user, error });
  }
}
```

Which would produce logs that look like this:

```txt
Creating account for { email: 'james@email.com', password: '123pass' }
User already exists { email: 'james@email.com', password: '123pass' }
Error creating user { user: { email: 'james@email.com', password: '123pass' }, error: 'User already exists' }
```

In your app, this gives a lot of information, but that information is likely useless. Imagine 10 different users hitting that piece of code at the same time. Logs are seperated and have no connection to each other. A very simple wide log would look like this:

```ts
function register(user: User) {
  const span: Record<string, unknown> = {
    event_name: "user_registration",
    level: "info",
    'user.email': user.email,
  };

  try {
    const exists = await check_user_exists(user);
    span["user.exisits"] = exists;

    if (!exists) {
      const create_user = await create_user(user);
      span["user.created"] = true;
      span["user.created_id"] = create_user.id;
    } else {
      throw new Error("User already exists");
    }
  } catch (error) {
    span["user.created"] = false;
    span.error = "message" in error ? error.message : String(error);
    span.level = "error";
  } finally {
    console[span.level](span);
  }
}
```

Which would produce logs that look like this:

```json
{
  "event_name": "user_registration",  
  level: "info",
  "user.email": "james@email.com",
  "user.exisits": true,
  "user.created": false,
  error: "User already exists",
}
```

Already you can see we get a super clean, simple log that gives us all the information we need about an event that took places in our system rather than having the information spread over three different logs. What's more, what get's logged will be consistent no matter what happens. If you look at the first example, you will see that there are a few different configurations that the logs can be emitted. With the wide log, you have a name of the log and then predefined information that can or cannot be there. You can always look for a log that has an event name of `user_registration` and see what data it has. This will immediately give you a lot more context about what happened.

## Concepts

When we are talking about wide logging, we are often talking about the concept of a logging span. A logging span is a single log that is emitted at the end of an event that contains all the information about that event. It is a way to structure your logs in a way that makes it easy to understand what happened during an event. It is also a way to ensure that you are logging all the information you need to understand what happened during an event. A span can be passed around in a system and can be used to collect events from multiple places. For example:

```ts
function register(user: User) {
  console.log("Creating account for", user); // First log here

  try {
    const exists = await check_user_exists(user); // Maybe a couple of logs here (maybe 2-3)

    if (!exists) {
      const create_user = await create_user(user); // A couple more logs here (maybe 2-3)
      console.info("User created successfully", create_user.id, new Date());
    } else {
      console.warn("User already exists", user); // Another log
      throw new Error("User already exists");
    }
  } catch (error) {
    console.error("Error creating user", { user, error }); // And another log here
  }
}
```

In this case we could have up to 7 different logs that are emitted during the registration process. These could also get emitted in a somewhat out of order way as both `check_user_exists` and `create_user` are asynchronous functions. With a logging span, you can pass your span on to your called functions and add information to it as you go. Then at the end of the registration process, you can emit one log that contains all the information about the registration process. This makes it much easier to understand what happened during the registration process and also makes it easier to debug if something goes wrong. This would look like this:

```ts
function register(user: User) {
  const span: Record<string, unknown> = {
    event_name: "user_registration",
    level: "info",
    'user.email': user.email,
  };

  try {
    const exists = await check_user_exists(user, span); // Pass the span to the function

    if (!exists) {
      const create_user = await create_user(user, span); // Pass the span to the function
      span["user.created"] = true;
      span["user.created_id"] = create_user.id;
    } else {
      throw new Error("User already exists");
    }
  } catch (error) {
    span["user.created"] = false;
    span.error = "message" in error ? error.message : String(error);
    span.level = "error";
  } finally {
    console[span.level](span); // Emit one log at the end of the process
  }
```

A span should only live for the lifetime of an event that takes place in our system and should not be logged multiple times. Within Lumberjack, we use the concept of closing a span to refer to the idea of sealing and ending the lifecycle of a logging span. However you are collecting your span, you should not be able to add to or edit your span after it has been logged. In the above examples, this will fall on the developer not to re-use the span after logging it. The other important concept to know is what Lumberjack calls a metric. A metric is a data point that is added to a span. It is a way to add information to a span in a structured manner. This can also be referred to as an attribute or a field. In the above examples, the metrics would be `user.email`, `user.exists`, `user.created`, `user.created_id`, and `error`. These are all pieces of information that are added to the span to give more context about what happened during the event.

## What is Does

On its own, wide logging can make a huge impact to the cleanliness of the logs in your system. However, the thing that gives logging spans their real power is when they are used in conjunction with a logging library that can collect and structure the logs in a way that makes it easy to understand what happened during an event. Instead of logging to the console, you can send these logs to some sort of logging service that will store that data and allow you to query it when you need to. This could be something like Sentry or even a custom logging service that you build yourself.

## Reading More

This is only a brief introduction to the concept of wide logging and logging spans. If you want to learn more about how to use Lumberjack logging spans in your project, check out the [usage documentation](/usage).

We also recommend you check out this absolutely amazing article by Boris Tane called [Logging Sucks](https://loggingsucks.com/). This gives a very good breakdown of why wide logging is so important.
