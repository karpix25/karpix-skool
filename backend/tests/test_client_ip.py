from types import SimpleNamespace

from app.utils.client_ip import client_ip_from_request, parse_trusted_proxy_cidrs


def _request(remote_host: str, headers: dict[str, str]):
    return SimpleNamespace(client=SimpleNamespace(host=remote_host), headers=headers)


def test_client_ip_ignores_x_forwarded_for_from_untrusted_peer():
    networks = parse_trusted_proxy_cidrs("127.0.0.1/32")

    client_ip = client_ip_from_request(
        _request("203.0.113.20", {"x-forwarded-for": "198.51.100.7"}),
        networks,
    )

    assert client_ip == "203.0.113.20"


def test_client_ip_uses_x_forwarded_for_from_trusted_proxy():
    networks = parse_trusted_proxy_cidrs("127.0.0.1/32,10.0.0.0/8")

    client_ip = client_ip_from_request(
        _request("127.0.0.1", {"x-forwarded-for": "198.51.100.7, 10.2.3.4"}),
        networks,
    )

    assert client_ip == "198.51.100.7"


def test_client_ip_falls_back_to_remote_peer_for_malformed_forwarded_header():
    networks = parse_trusted_proxy_cidrs("127.0.0.1/32")

    client_ip = client_ip_from_request(
        _request("127.0.0.1", {"x-forwarded-for": "not-an-ip"}),
        networks,
    )

    assert client_ip == "127.0.0.1"
