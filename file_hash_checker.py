import hashlib

def calculate_hashes(file_stream):
    hashes = {
        'MD5': hashlib.md5(),
        'SHA1': hashlib.sha1(),
        'SHA256': hashlib.sha256(),
        'SHA512': hashlib.sha512()
    }
    while chunk := file_stream.read(8192):
        for algo in hashes.values():
            algo.update(chunk)
    file_stream.seek(0)
    return {name: h.hexdigest() for name, h in hashes.items()}
