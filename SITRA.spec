# -*- mode: python ; coding: utf-8 -*-

import os
from PyInstaller.utils.hooks import collect_submodules

hidden_imports = [
    'sqlite3',
    'pyodbc',
    'pymysql',
    'yaml',
    'dotenv',
    'jinja2',
    'anyio',
    'anyio._backends',
    'anyio._backends._asyncio',
] + collect_submodules('pymysql') + collect_submodules('uvicorn') + collect_submodules('starlette') + collect_submodules('fastapi')

datas = [
    ('app/static', 'app/static'),
    ('app/templates', 'app/templates'),
    ('app/guia_seed.json', 'app'),
    ('config.yaml', '.'),
    ('.env.example', '.'),
]
if os.path.exists('.env'):
    datas.append(('.env', '.'))

a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SITRA',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
