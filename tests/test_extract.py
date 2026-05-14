# ============================================================
# tests/test_extract.py
# Unit tests for pipeline/extract.py
# Uses mocking — no real API calls made
# Run: pytest tests/test_extract.py -v
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pipeline'))

import pytest
from unittest.mock import patch, MagicMock
from extract import (
    fetch_carbon_intensity,
    fetch_node_prices,
    fetch_regional_prices,
    fetch_generation_forecast,
    fetch_reserve_prices,
    _build_session,
)


# ============================================================
# Helper — mock API response
# ============================================================

def mock_response(data: dict, status_code: int = 200):
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = data
    mock.raise_for_status = MagicMock()
    return mock


# ============================================================
# Tests
# ============================================================

class TestExtract:

    def test_build_session_returns_session(self):
        import requests
        session = _build_session()
        assert isinstance(session, requests.Session)

    def test_fetch_carbon_intensity_returns_dict(self):
        session = MagicMock()
        session.get.return_value = mock_response({"items": [], "count": 0})
        result = fetch_carbon_intensity(session)
        assert isinstance(result, dict)

    def test_fetch_node_prices_calls_correct_url(self):
        session = MagicMock()
        session.get.return_value = mock_response({"items": []})
        fetch_node_prices(session)
        call_url = session.get.call_args[0][0]
        assert "price/free_24hrs" in call_url

    def test_fetch_regional_prices_calls_correct_url(self):
        session = MagicMock()
        session.get.return_value = mock_response({"items": []})
        fetch_regional_prices(session)
        call_url = session.get.call_args[0][0]
        assert "region/price" in call_url

    def test_fetch_generation_forecast_calls_correct_url(self):
        session = MagicMock()
        session.get.return_value = mock_response({"items": []})
        fetch_generation_forecast(session)
        call_url = session.get.call_args[0][0]
        assert "ig_aggregated" in call_url

    def test_fetch_reserve_prices_calls_correct_url(self):
        session = MagicMock()
        session.get.return_value = mock_response({"items": []})
        fetch_reserve_prices(session)
        call_url = session.get.call_args[0][0]
        assert "current_reserve_prices" in call_url

    def test_http_error_raises(self):
        import requests
        session = MagicMock()
        session.get.return_value.raise_for_status.side_effect = \
            requests.exceptions.HTTPError("404")
        with pytest.raises(requests.exceptions.HTTPError):
            fetch_carbon_intensity(session)