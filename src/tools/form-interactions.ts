export async function handleFillForm(server: any, args: any) {
  if (!server.formHandler) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || !args.fields || !Array.isArray(args.fields)) {
    throw new Error(
      "Fields parameter is required for fill_form and must be an array"
    );
  }
  await server.formHandler.fillForm(args.fields);
  return {
    content: [
      {
        type: "text",
        text: `Form filled successfully with ${args.fields.length} fields`,
      },
    ],
  };
}

export async function handleSubmitForm(server: any, args: any) {
  if (!server.formHandler) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  await server.formHandler.submitForm(args || {});
  return {
    content: [
      {
        type: "text",
        text: "Form submitted successfully",
      },
    ],
  };
}
