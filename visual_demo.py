import streamlit as st
import pandas as pd

st.set_page_config(page_title="Gemini Demo", layout="wide")

# -----------------------------
# Data
# -----------------------------
before_df = pd.DataFrame([
    {
        "Type": "Bug",
        "Key": "DEV-142",
        "Summary": "Fix login timeout issue",
        "Status": "In Progress",
        "Assignee": "Alex Chen",
        "Priority": "High",
    },
    {
        "Type": "Story",
        "Key": "DEV-155",
        "Summary": "Payment API integration",
        "Status": "In Progress",
        "Assignee": "Sarah Li",
        "Priority": "Highest",
    },
    {
        "Type": "Task",
        "Key": "DEV-160",
        "Summary": "Update dashboard metrics",
        "Status": "To Do",
        "Assignee": "Maggie Zhang",
        "Priority": "Medium",
    },
])

after_df = pd.DataFrame([
    {
        "Type": "Bug",
        "Key": "DEV-142",
        "Summary": "Fix login timeout issue",
        "Status": "Done",
        "Assignee": "Alex Chen",
        "Priority": "High",
    },
    {
        "Type": "Story",
        "Key": "DEV-155",
        "Summary": "Payment API integration",
        "Status": "In Progress",
        "Assignee": "Sarah Li",
        "Priority": "Highest",
    },
    {
        "Type": "Sub-task",
        "Key": "DEV-155-1",
        "Summary": "QA Testing",
        "Status": "To Do",
        "Assignee": "QA Team",
        "Priority": "Medium",
    },
    {
        "Type": "Task",
        "Key": "DEV-160",
        "Summary": "Update dashboard metrics",
        "Status": "In Progress",
        "Assignee": "Maggie Zhang",
        "Priority": "Medium",
    },
])

transcript_lines = [
    "Alex: DEV-142 is done, we can close that.",
    "Sarah: Let's create QA testing under DEV-155.",
    "Maggie: I started DEV-160 yesterday, it is now in progress.",
]

pending_actions = [
    {
        "action": "Close ticket",
        "target": "DEV-142",
        "detail": "Task completed during stand-up",
        "risk": "Medium",
        "approval": "Required",
    },
    {
        "action": "Create subtask",
        "target": "DEV-155",
        "detail": "Create QA testing subtask",
        "risk": "Low",
        "approval": "Auto-approved",
    },
    {
        "action": "Update status",
        "target": "DEV-160",
        "detail": "Move from To Do to In Progress",
        "risk": "Low",
        "approval": "Auto-approved",
    },
]

# -----------------------------
# Helpers
# -----------------------------
def status_chip(status: str) -> str:
    if status == "Done":
        return f":green-badge[{status}]"
    if status == "In Progress":
        return f":blue-badge[{status}]"
    return f":gray-badge[{status}]"

def approval_chip(label: str) -> str:
    if label == "Required":
        return f":orange-badge[{label}]"
    return f":green-badge[{label}]"

# -----------------------------
# Session state
# -----------------------------
if "approved_close" not in st.session_state:
    st.session_state.approved_close = False

# -----------------------------
# Header
# -----------------------------
st.title("Gemini SprintMate")
st.caption("AI Jira Assistant Demo • TD Intern x Gemini Hackathon")
st.markdown(
    "An AI scrum assistant that turns stand-up conversations into Jira updates."
)

m1, m2, m3 = st.columns(3)
m1.metric("Actions Detected", 3)
m2.metric("Tickets Updated", 3)
m3.metric("Approval Needed", 1)

st.divider()

# -----------------------------
# Layout
# -----------------------------
left_col, right_col = st.columns([1, 1.6], gap="large")

with left_col:
    st.subheader("Meeting Transcript")
    for line in transcript_lines:
        st.info(line)

    st.subheader("Gemini Suggested Actions")
    for item in pending_actions:
        with st.container(border=True):
            top1, top2 = st.columns([3, 1])
            with top1:
                st.markdown(f"**{item['action']}**")
                st.markdown(f"**Target:** `{item['target']}`")
                st.write(item["detail"])
                st.caption(f"Risk: {item['risk']}")
            with top2:
                st.markdown(approval_chip(item["approval"]))

            if item["target"] == "DEV-142":
                b1, b2 = st.columns(2)
                with b1:
                    if st.button("Approve", key="approve_dev_142", use_container_width=True):
                        st.session_state.approved_close = True
                with b2:
                    st.button("Reject", key="reject_dev_142", use_container_width=True)

    st.subheader("Execution Log")
    st.success("Auto-approved: created subtask DEV-155-1 under DEV-155")
    st.success("Auto-approved: updated DEV-160 to In Progress")
    if st.session_state.approved_close:
        st.success("User approved: DEV-142 closed")
    else:
        st.warning("Pending approval: close DEV-142")

with right_col:
    st.subheader("Before Meeting")
    st.dataframe(before_df, use_container_width=True, hide_index=True)

    st.subheader("After Approval + Execution")
    if st.session_state.approved_close:
        shown_after = after_df.copy()
    else:
        shown_after = after_df.copy()
        shown_after.loc[shown_after["Key"] == "DEV-142", "Status"] = "Awaiting Approval"

    st.dataframe(shown_after, use_container_width=True, hide_index=True)

    st.subheader("Demo Notes")
    st.markdown(
        """
- High-risk actions can require explicit approval before execution.
- Low-risk actions can be auto-approved with an audit trail.
- The same pattern can support comments, assignment changes, and stale-ticket cleanup.
        """
    )

st.divider()
st.markdown(
    """
**How to run locally**

```bash
pip install -r requirements.txt
streamlit run visual_demo.py
```

**How to deploy**
- Push `visual_demo.py` and `requirements.txt` to GitHub
- Deploy with Streamlit Community Cloud
- Set the main file path to `visual_demo.py`
"""
)
