' Wrapper que executa start-dev.bat em janela escondida.
' Escolhido como target do atalho na area de trabalho pra cliente nao ver terminal.
' Logs vao pra desktop\last-run.log se quiser debugar.
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBat = strDir & "\start-dev.bat"
WshShell.Run Chr(34) & strBat & Chr(34), 0, False
Set WshShell = Nothing
Set fso = Nothing
