using ClosedXML.Excel;
using FastMember;
using System.Collections;
using System.IO;

namespace Serenity.Reporting;

public static class ExcelReportGenerator
{
    public static byte[] GeneratePackageBytes(List<ReportColumn> columns, IList rows,
        string sheetName = "Page1", string tableName = "Table1", XLTableTheme tableStyle = null,
        int startRow = 1, int startCol = 1, int autoFitRows = 250)
    {
        using var package = GeneratePackage(columns, rows, sheetName, tableName, tableStyle,
            startRow, startCol, autoFitRows);
        using var ms = new MemoryStream();
        package.SaveAs(ms);
        return ms.ToArray();
    }

    public static XLWorkbook GeneratePackage(List<ReportColumn> columns, IList rows,
        string sheetName = "Page1", string tableName = "Table1", XLTableTheme tableStyle = null,
        int startRow = 1, int startCol = 1, int autoFitRows = 250)
    {
        var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add(sheetName);

        PopulateSheet(worksheet, columns, rows, tableName, tableStyle,
            startRow, startCol, autoFitRows);

        return workbook;
    }

    private static readonly Type[] DateTimeTypes =
    [
        typeof(DateTime),
        typeof(DateTime?),
        typeof(TimeSpan),
        typeof(TimeSpan?)
    ];

    private static string FixFormatSpecifier(string format, Type dataType)
    {
        if (string.IsNullOrEmpty(format))
            return format;

        if (format.Contains('f', StringComparison.Ordinal) &&
            Array.IndexOf(DateTimeTypes, dataType) >= 0)
            return format.Replace('f', '0');

        return format;
    }

    public static void PopulateSheet(IXLWorksheet worksheet, List<ReportColumn> columns, IList rows,
        string tableName = "Table1", XLTableTheme tableStyle = null,
        int startRow = 1, int startCol = 1, int autoFitRows = 250)
    {
        ArgumentNullException.ThrowIfNull(columns);

        ArgumentNullException.ThrowIfNull(rows);

        Field[] fields = null;
        TypeAccessor accessor = null;
        bool[] invalidProperty = null;

        var colCount = columns.Count;

        int endCol = startCol + colCount - 1;
        int endRow = rows.Count + startRow;

        var header = worksheet.Row(startRow);
        var columnNames = columns.Select(x => (x.Title ?? x.Name)).ToArray();
        if (!string.IsNullOrEmpty(tableName))
        {
            // ensure columns has unique names by adding spaces otherwise export fails
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < columnNames.Length; i++)
            {
                var x = 0;
                var name = columnNames[i];
                if (string.IsNullOrEmpty(name))
                    name = " ";
                string newName;
                do
                {
                    newName = x == 0 ? name : (name + new string(' ', x));
                    x++;
                }
                while (!used.Add(newName));
                columnNames[i] = newName;
            }
        }

        for (var i = 0; i < columnNames.Length; i++)
        {
            worksheet.Cell(startRow, startCol + i).Value = columnNames[i];
        }

        var dataList = new List<object[]>();
        foreach (var obj in rows)
        {
            var data = new object[colCount];
            var row = obj as IRow;
            if (row != null)
            {
                if (fields == null)
                {
                    fields = new Field[colCount];
                    for (var i = 0; i < columns.Count; i++)
                    {
                        var n = columns[i].Name;
                        fields[i] = row.FindFieldByPropertyName(n) ?? row.FindField(n);
                    }
                }
            }
            else if (obj != null)
            {
                if (obj is IDictionary || obj is IDictionary<string, object>)
                {
                }
                else if (accessor == null)
                {
                    accessor = TypeAccessor.Create(obj.GetType());
                    invalidProperty = new bool[colCount];
                    for (var c = 0; c < colCount; c++)
                        try
                        {
                            if (accessor[obj, columns[c].Name] != null)
                            {
                            }
                        }
                        catch
                        {
                            invalidProperty[c] = true;
                        }
                }
            }

            for (var c = 0; c < colCount; c++)
            {
                if (row != null)
                {
                    var field = fields[c];
                    if (field is not null)
                        data[c] = field.AsObject(row);
                }
                else if (obj is IDictionary<string, object>)
                {
                    var n = columns[c].Name;
                    var dict = obj as IDictionary<string, object>;
                    if (dict.TryGetValue(n, out object v))
                        data[c] = v;
                }
                else if (obj is IDictionary)
                {
                    var n = columns[c].Name;
                    var dict = obj as IDictionary;
                    if (dict.Contains(n))
                        data[c] = dict[n];
                }
                else if (obj != null)
                {
                    if (!invalidProperty[c])
                        data[c] = accessor[obj, columns[c].Name];
                }
            }

            dataList.Add(data);
        }

        if (rows.Count > 0)
        {
            var dataRange = worksheet.Cell(startRow + 1, startCol);
            dataRange.InsertData(dataList);
        }

        if (!string.IsNullOrEmpty(tableName))
        {
            var tableRange = worksheet.Range(startRow, startCol, endRow, endCol);
            string newTableName;
            int x = 0;
            do
            {
                newTableName = x == 0 ? tableName : x == 1 ? (tableName + '_') : (tableName + '_' + x);
                x++;
            }
            while (worksheet.Workbook.Worksheets.Any(x => x.Tables.Any(t => string.Equals(newTableName, t.Name, StringComparison.OrdinalIgnoreCase))));
            try
            {
                var table = tableRange.CreateTable(newTableName);
                table.Theme = tableStyle ?? XLTableTheme.TableStyleMedium2;
            }
            catch
            {
                // ignore table creation errors for now
            }
        }

        for (var i = startCol; i <= endCol; i++)
        {
            var column = columns[i - startCol];
            if (!string.IsNullOrEmpty(column.Format))
                worksheet.Column(i).Style.NumberFormat.Format = FixFormatSpecifier(column.Format, column.DataType);
        }

        bool gdiErrors = false;
        try
        {
            if (autoFitRows > 0)
                worksheet.Columns(1, endCol).AdjustToContents(startRow: startRow, endRow: Math.Min(endRow, startRow + autoFitRows));
        }
        catch (TypeInitializationException)
        {
            gdiErrors = true;
        }

        for (var colNum = startCol; colNum <= endCol; colNum++)
        {
            var col = columns[colNum - startCol];
            var decorator = col.Decorator;
            if (decorator != null)
            {
                for (var rowNum = startRow + 1; rowNum <= endRow; rowNum++)
                {
                    var obj = rows[rowNum - startRow - 1];
                    decorator.Item = obj;
                    decorator.Name = col.Name;
                    decorator.Format = null;
                    decorator.Background = null;
                    decorator.Foreground = null;

                    object value = null;
                    if (obj is IRow row)
                    {
                        var field = fields[colNum - 1];
                        if (field is not null)
                            value = field.AsObject(row);
                    }
                    else if (obj is IDictionary<string, object>)
                    {
                        var n = col.Name;
                        var dict = obj as IDictionary<string, object>;
                        if (!dict.TryGetValue(n, out value))
                            value = null;
                    }
                    else if (obj is IDictionary)
                    {
                        var n = col.Name;
                        var dict = obj as IDictionary;
                        if (dict.Contains(n))
                            value = dict[n];
                    }
                    else if (obj != null)
                    {
                        if (!invalidProperty[colNum - startCol])
                            value = accessor[obj, col.Name];
                    }
                    else
                        continue;

                    decorator.Value = value;
                    decorator.Decorate();

                    if (!string.IsNullOrEmpty(decorator.Background) ||
                        !string.IsNullOrEmpty(decorator.Foreground) ||
                        !Equals(decorator.Value, value) ||
                        decorator.Format != null)
                    {
                        var cell = worksheet.Cell(rowNum, colNum);

                        if (!gdiErrors)
                        {
                            if (!string.IsNullOrEmpty(decorator.Background))
                            {
                                cell.Style.Fill.PatternType = XLFillPatternValues.Solid;
                                cell.Style.Fill.SetBackgroundColor(
                                    XLColor.FromHtml(decorator.Background));
                            }

                            if (!string.IsNullOrEmpty(decorator.Foreground))
                                cell.Style.Font.SetFontColor(
                                    XLColor.FromHtml(decorator.Foreground));
                        }

                        if (decorator.Format != null)
                            cell.Style.NumberFormat.Format = FixFormatSpecifier(decorator.Format, col.DataType);

                        if (!Equals(decorator.Value, value))
                            cell.SetValue(XLCellValue.FromObject(decorator.Value));
                    }
                }
            }
        }
    }


    public static object AsObject(this XLCellValue value)
    {
        return value.Type switch
        {
            XLDataType.Blank => null,
            XLDataType.Boolean => value.GetBoolean(),
            XLDataType.Number => value.GetNumber(),
            XLDataType.Text => value.GetText(),
            XLDataType.Error => value.GetError(),
            XLDataType.DateTime => value.GetDateTime(),
            XLDataType.TimeSpan => value.GetTimeSpan(),
            _ => throw new InvalidCastException()
        };
    }
}