export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Privacy</h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        <h2>Your statement is read in your browser</h2>
        <p>
          When you select a statement, the PDF is opened and read by code running in this
          browser tab. The file itself is never uploaded, and the password you enter to
          open it is used once and then discarded. Neither ever reaches a server.
        </p>
        <p>
          <strong>You can verify this.</strong> Open your browser&apos;s developer tools,
          switch to the Network tab, and watch while you open a statement. No request
          carries the file or the password.
        </p>

        <h2>Nothing is stored unless you ask</h2>
        <p>
          Without an account, nothing is saved anywhere. Close the tab and the data is
          gone.
        </p>
        <p>
          If you create an account and choose to save a statement, the parsed transaction
          list is stored — dates, amounts, transaction types, and the counterparty names
          and partial phone numbers that appear on the statement. The PDF is not stored,
          and neither is its password.
        </p>

        <h2>Deleting your data</h2>
        <p>
          Every saved statement can be deleted from its page. Deleting a statement removes
          its transactions and any recorded parsing issues.
        </p>

        <h2>What this project is</h2>
        <p>
          This is a portfolio project rather than a commercial service. It is not marketed,
          and it is shared by link. If you would rather not store anything, use it without
          an account — every feature except saving works that way.
        </p>
      </div>
    </div>
  );
}