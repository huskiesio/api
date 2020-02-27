# api
## Types

```typescript
interface SiObject {
    id: string;
    updatedAt: number;
    createdAt: number;
}
```

> Each type below will inherit the types above...

```typescript
interface Thread {
    name: string;
    description: string;
    memberIds: string[];
}
```

```typescript
interface Device {
    userId: string;
    name: string;
    publicKey: Buffer;
}
```

```typescript
interface DirectoryContact {
    username: string;
    firstName: string;
    lastName: string;
}
```

```typescript
interface Registration {
    username: string;
    code: string;
    userPublicKey: Buffer;
    devicePublicKey: Buffer;
    salt: Buffer;
    password: Buffer;
}
```

```typescript
interface Message {
    threadId: string;
    senderId: string;
    payload: Buffer;
}
```

```typescript
interface User {
    firstName: string;
    lastName: string;
    username: string;
    salt: Buffer;
    password: Buffer;
    publicKey: Buffer;
}
```