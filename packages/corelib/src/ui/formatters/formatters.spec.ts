
jest.mock("../../base", () => ({
    ...jest.requireActual("../../base"),
    tryGetText: jest.fn().mockImplementation((key: string) => key)
}));

import { createFormatterContext } from "@serenity-is/sleekgrid";
import { addCustomAttribute, registerEnum } from "../../base";
import { EnumKeyAttribute } from "../../types/attributes";
import { EnumTypeRegistry } from "../../types/enumtyperegistry";
import { BooleanFormatter, CheckboxFormatter, DateFormatter, DateTimeFormatter, EnumFormatter, FileDownloadFormatter, MinuteFormatter, NumberFormatter, UrlFormatter } from "./formatters";

beforeEach(() => {
    jest.restoreAllMocks();
    EnumTypeRegistry.reset();
});

describe("BooleanFormatter", () => {
    it("shows empty string if value is null", () => {
        var formatter = new BooleanFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
    });

    it("shows true text from localizer if value is true and true text is not null", () => {
        var formatter = new BooleanFormatter();
        formatter.trueText = "trueText";
        expect(formatter.format(createFormatterContext({ value: true }))).toBe("trueText");
    });

    it("shows false text from localizer if value is false and false text is not null", () => {
        var formatter = new BooleanFormatter();
        formatter.falseText = "falseText";
        expect(formatter.format(createFormatterContext({ value: false }))).toBe("falseText");
    });

    it("shows Dialogs.YesButton text from localizer if value is true and true text is null", () => {
        var formatter = new BooleanFormatter();
        expect(formatter.format(createFormatterContext({ value: true }))).toBe("Yes");
    });

    it("shows Dialogs.NoButton text from localizer if value is false and false text is null", () => {
        var formatter = new BooleanFormatter();
        expect(formatter.format(createFormatterContext({ value: false }))).toBe("No");
    });

    it("shows Yes text from localizer if value is true and Dialogs.YesButton is null", () => {
        var formatter = new BooleanFormatter();
        expect(formatter.format(createFormatterContext({ value: true }))).toBe("Yes");
    });

    it("shows No text from localizer if value is false and Dialogs.NoButton is null", () => {
        var formatter = new BooleanFormatter();
        expect(formatter.format(createFormatterContext({ value: false }))).toBe("No");
    });
})

describe("CheckboxFormatter", () => {
    it("shows checked class if value is true", () => {
        var formatter = new CheckboxFormatter();
        expect(formatter.format(createFormatterContext({ value: true }))).toContain("checked");
    })

    it("removes checked class if value is false", () => {
        var formatter = new CheckboxFormatter();
        expect(formatter.format(createFormatterContext({ value: false }))).not.toContain("checked");
    })
})

describe("DateFormatter", () => {
    it("shows empty string if value is null", () => {
        var formatter = new DateFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
    });

    it("shows formatted date if value type is Date", () => {
        var formatter = new DateFormatter();
        var date = new Date(2023, 0, 1); // 01-01-2023
        expect(formatter.format(createFormatterContext({ value: date }))).toBe("01/01/2023");
    });

    it("shows formatted date if value type string and it is a date", () => {
        var formatter = new DateFormatter();
        expect(formatter.format(createFormatterContext({ value: "2023-01-01T00:00:00.000Z" }))).toBe("01/01/2023");
    });

    it("shows given value if value type is string and it is not a date", () => {
        var formatter = new DateFormatter();
        expect(formatter.format(createFormatterContext({ value: "this is not a date" }))).toBe("this is not a date");
    });

    it("shows given value if value type is string and it is empty", () => {
        var formatter = new DateFormatter();
        expect(formatter.format(createFormatterContext({ value: "" }))).toBe("");
    });

    it("uses given display format", () => {
        var formatter = new DateFormatter();
        formatter.displayFormat = "dd-MM-yyyy";
        expect(formatter.format(createFormatterContext({ value: "2023-01-01T00:00:00.000Z" }))).toBe("01-01-2023");
    });
})

describe("DateTimeFormatter", () => {
    it("shows correctly formatted date time", () => {
        var formatter = new DateTimeFormatter();
        var date = new Date(2023, 0, 1, 12, 15, 18); // 01-01-2023 12:15:18
        expect(formatter.format(createFormatterContext({ value: date }))).toBe("01/01/2023 12:15:18");
    });
})

describe("EnumFormatter", () => {

    it("shows empty string if value is null", () => {
        enum TestEnum {
            Value1 = 1
        };
        registerEnum(TestEnum, "TestEnum", "TestEnum");
        var formatter = new EnumFormatter();
        formatter.enumKey = "TestEnum";
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
    });

    it("shows localized text of enum value", () => {
        enum TestEnum {
            Value1 = 1
        };
        registerEnum(TestEnum, "TestEnum", "TestEnum");
        var formatter = new EnumFormatter();
        formatter.enumKey = "TestEnum";
        expect(formatter.format(createFormatterContext({ value: 1 }))).toBe("Enums.TestEnum.Value1");
    });

    it("uses attribute key instead of enum name", () => {
        enum TestEnum {
            Value1 = 1
        };
        addCustomAttribute(TestEnum, new EnumKeyAttribute("TestEnum2"));
        registerEnum(TestEnum, "TestEnum");
        var formatter = new EnumFormatter();
        formatter.enumKey = "TestEnum";
        expect(formatter.format(createFormatterContext({ value: 1 }))).toBe("Enums.TestEnum2.Value1");
    });

    it("returns name for give enumkey and value", () => {
        enum TestEnum {
            Value1 = 1
        };
        registerEnum(TestEnum, "TestEnum", "TestEnum");
        var value = EnumFormatter.getName(EnumTypeRegistry.get("TestEnum"), 1);
        expect(value).toBe("Value1");
    })
});

describe("FileDownloadFormatter", () => {
    it("shows empty string if value is null", () => {
        var formatter = new FileDownloadFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
    });


    it("replaces all backward slashes to forward", () => {
        var formatter = new FileDownloadFormatter();
        expect(formatter.format(createFormatterContext({ value: "file\\with\\backward\\slashes" }))).toContain("file/with/backward/slashes");
    });

    it("shows empty string if fileOriginalName is not specified", () => {
        var formatter = new FileDownloadFormatter();
        expect(formatter.format(createFormatterContext({ value: "file" })).replace(/\s/g, "")).toContain("</i></a>");
    });

    it("shows empty string if fileOriginalName is specified but not found", () => {
        var formatter = new FileDownloadFormatter();
        formatter.originalNameProperty = "fileOriginalName";
        expect(formatter.format(createFormatterContext({ value: "file", item: {} })).replace(/\s/g, "")).toContain("</i></a>");
    });

    it("shows fileOriginalName if fileOriginalName is specified and found", () => {
        var formatter = new FileDownloadFormatter();
        formatter.originalNameProperty = "fileOriginalName";
        expect(formatter.format(createFormatterContext({ value: "file", item: { fileOriginalName: "test" } }))).toContain("</i> test</a>");
    });

    it("uses displayFormat if displayFormat is specified", () => {
        var formatter = new FileDownloadFormatter();
        formatter.originalNameProperty = "fileOriginalName";
        formatter.displayFormat = "originalName: {0} dbFile: {1} downloadUrl: {2}"
        expect(formatter.format(createFormatterContext({ value: "file", item: { fileOriginalName: "test" } })))
            .toContain("</i> originalName: test dbFile: file downloadUrl: /upload/file</a>");
    });

    it("uses icon if specified", () => {
        var formatter = new FileDownloadFormatter();
        formatter.iconClass = "testicon"
        expect(formatter.format(createFormatterContext({ value: "file", item: { fileOriginalName: "test" } })))
            .toContain("'testicon'");
    });

    it("adds fa if icon starts with fa", () => {
        var formatter = new FileDownloadFormatter();
        formatter.iconClass = "fa-testicon"
        expect(formatter.format(createFormatterContext({ value: "file", item: { fileOriginalName: "test" } })))
            .toContain("'fa fa-testicon'");
    });

    it("uses default icon if not specified", () => {
        var formatter = new FileDownloadFormatter();
        expect(formatter.format(createFormatterContext({ value: "file", item: { fileOriginalName: "test" } })))
            .toContain("'fa fa-download'");
    });

    it("adds originalNameProperty to referencedFields if specified", () => {
        var formatter = new FileDownloadFormatter();
        formatter.originalNameProperty = "fileOriginalName";
        var column = {};
        formatter.initializeColumn(column);
        expect(column).toEqual({ referencedFields: ["fileOriginalName"] });
    })
});

describe("MinuteFormatter", () => {

    it("shows empty string if value is null", () => {
        var formatter = new MinuteFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
        expect(formatter.format(createFormatterContext({ value: NaN }))).toBe("");
    })

    it("shows correctly formatted minute", () => {
        var formatter = new MinuteFormatter();

        expect(formatter.format(createFormatterContext({ value: 0 }))).toBe("00:00");
        expect(formatter.format(createFormatterContext({ value: 12 }))).toBe("00:12");
        expect(formatter.format(createFormatterContext({ value: 72 }))).toBe("01:12");
        expect(formatter.format(createFormatterContext({ value: 680 }))).toBe("11:20");
        expect(formatter.format(createFormatterContext({ value: 1360 }))).toBe("22:40");
    })
})

describe("NumberFormatter", () => {
    it("shows empty string if value is null", () => {
        var formatter = new NumberFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
        expect(formatter.format(createFormatterContext({ value: NaN }))).toBe("");
    });

    it("shows formatted number if value type is number", () => {
        var formatter = new NumberFormatter();
        expect(formatter.format(createFormatterContext({ value: 123456.789 }))).toBe("123456.79");
    });

    it("parses shows formatted number if value type is string", () => {
        var formatter = new NumberFormatter();
        expect(formatter.format(createFormatterContext({ value: "123456.789" }))).toBe("123456.79");
    });

    it("shows given string value if value type is string and it is not a number", () => {
        var formatter = new NumberFormatter();
        expect(formatter.format(createFormatterContext({ value: "this is not a number" }))).toBe("this is not a number");
    });

    it("uses given numberformat", () => {
        var formatter = new NumberFormatter();
        formatter.displayFormat = "0.###"
        expect(formatter.format(createFormatterContext({ value: "123456.789" }))).toBe("123456.789");
    });
})

describe("UrlFormatter", () => {
    it("shows empty string if value is null or empty", () => {
        var formatter = new UrlFormatter();
        expect(formatter.format(createFormatterContext({ value: null }))).toBe("");
        expect(formatter.format(createFormatterContext({ value: "" }))).toBe("");
    })

    it("shows empty string if urlProperty value is null or empty", () => {
        var formatter = new UrlFormatter();
        formatter.urlProperty = "url";
        expect(formatter.format(createFormatterContext({ value: null, item: { url: null } }))).toBe("");
        expect(formatter.format(createFormatterContext({ value: null, item: { url: "" } }))).toBe("");
    })

    it("shows link if url is specified", () => {
        var formatter = new UrlFormatter();
        expect(formatter.format(createFormatterContext({ value: "test" }))).toContain("'test'");
    })

    it("formats url if format is specified", () => {
        var formatter = new UrlFormatter();
        formatter.urlFormat = "test/{0}";
        expect(formatter.format(createFormatterContext({ value: "test" }))).toContain("'test/test'");
    })

    it("resolves url if it starts with tilda", () => {
        var formatter = new UrlFormatter();
        expect(formatter.format(createFormatterContext({ value: "~/test" }))).toContain("'/test'");
    })

    it("uses display format property for showing if specified", () => {
        var formatter = new UrlFormatter();
        formatter.displayFormat = "displayFormat {0}"
        expect(formatter.format(createFormatterContext({ value: "~/test" }))).toContain("displayFormat ~/test");
    })

    it("adds target if specified", () => {
        var formatter = new UrlFormatter();
        formatter.target = "_blank"
        expect(formatter.format(createFormatterContext({ value: "~/test" }))).toContain("target='_blank'");
    })

    it("adds diplayProperty and UrlProperty to referencedFields if specified", () => {
        var formatter = new UrlFormatter();
        formatter.displayProperty = "display";
        formatter.urlProperty = "url";
        var column = {};
        formatter.initializeColumn(column);
        expect(column).toEqual({ referencedFields: ["display", "url"] });
    });
})