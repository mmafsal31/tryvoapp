class MediaCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Apply headers ONLY for media files
        if request.path.startswith("/media/"):
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Range"
            response["Access-Control-Expose-Headers"] = "Content-Length, Content-Range"
            response["Cross-Origin-Resource-Policy"] = "cross-origin"
            response["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"

        return response
