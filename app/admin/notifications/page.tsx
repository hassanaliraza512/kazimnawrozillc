"use client";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
	AdminListControls,
	useAdminList,
} from "@/components/AdminListControls";

type ChannelStatus = { emailConfigured: boolean; whatsappConfigured: boolean };
type Subscriber = {
	id: number;
	email: string;
	status: string;
	created_at: string;
	email_sent_at: string | null;
	delivery_error: string;
};

export default function Notifications() {
	const [rows, setRows] = useState<any[]>([]);
	const [channels, setChannels] = useState<ChannelStatus>({ emailConfigured: false, whatsappConfigured: false });
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [emailConfigured, setEmailConfigured] = useState(false);
	const [subscriberError, setSubscriberError] = useState("");
	const [approvingId, setApprovingId] = useState<number | null>(null);
	const subscriberList = useAdminList(
		subscribers,
		(subscriber) =>
			`${subscriber.email} ${subscriber.status} ${subscriber.created_at} ${subscriber.delivery_error}`,
	);
	const notificationList = useAdminList(
		rows,
		(row) =>
			`${row.order_number} ${row.kind} ${row.recipient} ${row.provider} ${row.sent ? "sent" : "recorded"} ${row.error} ${row.created_at}`,
	);

	useEffect(() => {
		fetch("/api/admin/notifications", { cache: "no-store" })
			.then((response) => response.json())
			.then((data) => {
				setRows(Array.isArray(data.rows) ? data.rows : []);
				if (data.channels) setChannels(data.channels);
			});
		loadSubscribers();
	}, []);

	async function loadSubscribers() {
		try {
			const response = await fetch("/api/admin/subscribers", { cache: "no-store" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Unable to load subscribers.");
			setSubscribers(Array.isArray(data.rows) ? data.rows : []);
			setEmailConfigured(Boolean(data.emailConfigured));
		} catch (error) {
			setSubscriberError(error instanceof Error ? error.message : "Unable to load subscribers.");
		}
	}

	async function approveSubscriber(id: number) {
		setApprovingId(id);
		setSubscriberError("");
		try {
			const response = await fetch("/api/admin/subscribers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Email could not be sent.");
			await loadSubscribers();
		} catch (error) {
			setSubscriberError(error instanceof Error ? error.message : "Email could not be sent.");
			await loadSubscribers();
		} finally {
			setApprovingId(null);
		}
	}

	return (
		<AdminShell>
			<p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">Customer communications</p>
			<h1 className="mt-2 text-4xl">Notification Log</h1>
			<p className="mt-2 text-sm text-[var(--muted)]">
				Order confirmations and status updates are sent by email or WhatsApp when the customer has opted in and the channel is configured.
			</p>
			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				<Channel label="Email · SMTP" configured={channels.emailConfigured} />
				<Channel label="WhatsApp · Twilio" configured={channels.whatsappConfigured} />
			</div>
			<section className="mt-8 border border-[var(--line)] bg-white">
				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] p-5">
					<div>
						<h2 className="font-serif text-2xl">Mailing list approvals</h2>
						<p className="mt-1 text-sm text-[var(--muted)]">
							Approve a request to send a confirmation email to that address.
						</p>
					</div>
					<p className={`text-sm ${emailConfigured ? "text-green-700" : "text-[var(--burgundy)]"}`}>
						{emailConfigured ? "SMTP email is ready" : "Set SMTP_HOST and SMTP_FROM (or SMTP_USER) in .env.local"}
					</p>
				</div>
				{subscriberError && <p role="alert" className="border-b border-[var(--line)] px-5 py-3 text-sm text-[var(--burgundy)]">{subscriberError}</p>}
				<div className="p-5 pb-0">
					<AdminListControls
						search={subscriberList.search}
						onSearchChange={subscriberList.setSearch}
						totalCount={subscriberList.filteredItems.length}
						currentPage={subscriberList.currentPage}
						pageCount={subscriberList.pageCount}
						onPageChange={subscriberList.setCurrentPage}
						placeholder="Search mailing list by email or status"
					/>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[650px] text-left text-sm">
						<thead className="bg-[var(--ivory)] text-xs uppercase tracking-wider">
							<tr>
								<th className="p-4">Customer email</th>
								<th className="p-4">Requested</th>
								<th className="p-4">Status</th>
								<th className="p-4">Action</th>
							</tr>
						</thead>
						<tbody>
							{subscriberList.visibleItems.map((subscriber) => (
								<tr key={subscriber.id} className="border-t border-[var(--line)]">
									<td className="p-4 font-medium">{subscriber.email}</td>
									<td className="p-4">{new Date(subscriber.created_at).toLocaleString()}</td>
									<td className="p-4">
										{subscriber.status === "approved" ? "Approved · email sent" : subscriber.status === "sending" ? "Sending email..." : "Pending approval"}
										{subscriber.delivery_error && <p className="mt-1 max-w-sm text-xs text-[var(--burgundy)]">Previous attempt: {subscriber.delivery_error}</p>}
									</td>
									<td className="p-4">
										{subscriber.status === "pending" && (
											<button
												type="button"
												onClick={() => approveSubscriber(subscriber.id)}
												disabled={!emailConfigured || approvingId !== null}
												className="bg-[var(--charcoal)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
											>
												{approvingId === subscriber.id ? "Sending..." : "Approve and email"}
											</button>
										)}
									</td>
								</tr>
							))}
							{!subscriberList.visibleItems.length && <tr><td colSpan={4} className="p-8 text-center text-[var(--muted)]">{subscribers.length ? "No subscription requests match your search." : "No subscription requests yet."}</td></tr>}
						</tbody>
					</table>
				</div>
			</section>
			<div className="mt-7 mb-4">
				<AdminListControls
					search={notificationList.search}
					onSearchChange={notificationList.setSearch}
					totalCount={notificationList.filteredItems.length}
					currentPage={notificationList.currentPage}
					pageCount={notificationList.pageCount}
					onPageChange={notificationList.setCurrentPage}
					placeholder="Search notifications by order, recipient, channel, or status"
				/>
			</div>
			<div className="overflow-x-auto border border-[var(--line)]">
				<table className="w-full min-w-[900px] text-left text-sm">
					<thead className="bg-[var(--ivory)] text-xs uppercase tracking-wider">
						<tr>
							<th className="p-4">Order</th><th className="p-4">Type</th><th className="p-4">Recipient</th>
							<th className="p-4">Channel</th><th className="p-4">Status</th><th className="p-4">Date</th>
						</tr>
					</thead>
					<tbody>
						{notificationList.visibleItems.map((row) => (
							<tr key={row.id} className="border-t border-[var(--line)]">
								<td className="p-4 font-semibold">{row.order_number}</td>
								<td className="p-4">{row.kind.replaceAll("_", " ")}</td>
								<td className="p-4">{row.recipient}</td>
								<td className="p-4">{row.provider}</td>
								<td className="max-w-md p-4">{row.sent ? "Sent" : row.error || "Recorded"}</td>
								<td className="p-4">{new Date(row.created_at).toLocaleString()}</td>
							</tr>
						))}
						{!notificationList.visibleItems.length && <tr><td colSpan={6} className="p-8 text-center text-[var(--muted)]">{rows.length ? "No notifications match your search." : "No notifications recorded yet."}</td></tr>}
					</tbody>
				</table>
			</div>
		</AdminShell>
	);
}

function Channel({ label, configured }: { label: string; configured: boolean }) {
	return (
		<div className="flex items-center justify-between border border-[var(--line)] px-4 py-3 text-sm">
			<span>{label}</span>
			<span className={configured ? "text-green-700" : "text-[var(--muted)]"}>
				{configured ? "Configured" : "Not configured"}
			</span>
		</div>
	);
}
