from ipaddress import ip_address, ip_network
from typing import Iterable


def parse_trusted_proxy_cidrs(raw_cidrs: str | None) -> tuple:
    networks = []
    for raw_value in (raw_cidrs or "").split(","):
        value = raw_value.strip()
        if not value:
            continue
        try:
            networks.append(ip_network(value, strict=False))
        except ValueError:
            continue
    return tuple(networks)


def client_ip_from_request(request, trusted_proxy_networks: Iterable) -> str:
    remote_host = getattr(getattr(request, "client", None), "host", None)
    remote_ip = _ip_from_host(remote_host)
    if remote_ip is None:
        return remote_host or "unknown"

    if not _is_trusted_proxy(remote_ip, trusted_proxy_networks):
        return str(remote_ip)

    forwarded_for = request.headers.get("x-forwarded-for")
    forwarded_ip = _client_ip_from_x_forwarded_for(forwarded_for, trusted_proxy_networks)
    if forwarded_ip:
        return forwarded_ip

    real_ip = _ip_from_host(request.headers.get("x-real-ip"))
    return str(real_ip or remote_ip)


def _client_ip_from_x_forwarded_for(raw_value: str | None, trusted_proxy_networks: Iterable) -> str | None:
    if not raw_value:
        return None

    addresses = [_ip_from_host(part) for part in raw_value.split(",")]
    addresses = [address for address in addresses if address is not None]
    if not addresses:
        return None

    for address in reversed(addresses):
        if not _is_trusted_proxy(address, trusted_proxy_networks):
            return str(address)
    return str(addresses[0])


def _is_trusted_proxy(address, trusted_proxy_networks: Iterable) -> bool:
    return any(address in network for network in trusted_proxy_networks)


def _ip_from_host(host: str | None):
    if not host:
        return None

    value = host.strip()
    if value.startswith("[") and "]" in value:
        value = value[1:value.index("]")]
    elif value.count(":") == 1 and "." in value:
        value = value.split(":", 1)[0]

    try:
        return ip_address(value)
    except ValueError:
        return None
