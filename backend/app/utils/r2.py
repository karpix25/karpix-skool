from contextlib import asynccontextmanager
import uuid

from ..config import settings


try:
    import aioboto3
except ModuleNotFoundError:  # pragma: no cover - exercised only in minimal local test envs
    aioboto3 = None


class R2Storage:
    def __init__(self):
        self.session = aioboto3.Session() if aioboto3 else None
        self.endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if settings.R2_ACCOUNT_ID else None
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_url = settings.R2_PUBLIC_URL.rstrip("/") if settings.R2_PUBLIC_URL else None

    @asynccontextmanager
    async def get_client(self):
        if self.session is None:
            raise RuntimeError("aioboto3 is required for R2 storage operations")
        async with self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as client:
            yield client

    def build_key(self, filename: str, folder: str = "oblozhki", use_uuid: bool = True) -> str:
        ext = filename.split(".")[-1] if "." in filename else "jpg"

        if use_uuid:
            return f"{folder}/{uuid.uuid4()}.{ext}"

        safe_name = "".join([c for c in filename if c.isalnum() or c in "._-"])
        return f"{folder}/{safe_name}"

    def build_public_url(self, key: str) -> str:
        if not self.public_url:
            raise RuntimeError("R2_PUBLIC_URL is not configured")
        return f"{self.public_url}/{key}"

    async def put_file(self, file_content: bytes, key: str, content_type: str = "image/jpeg") -> None:
        async with self.get_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                ContentType=content_type
            )

    async def read_file(self, key: str) -> tuple[bytes, str | None]:
        async with self.get_client() as client:
            obj = await client.get_object(Bucket=self.bucket_name, Key=key)
            return await obj["Body"].read(), obj.get("ContentType")

    async def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/jpeg", folder: str = "oblozhki", use_uuid: bool = True) -> str:
        key = self.build_key(filename=filename, folder=folder, use_uuid=use_uuid)
        await self.put_file(file_content=file_content, key=key, content_type=content_type)
        return self.build_public_url(key)

storage = R2Storage()
