// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title KIBU Voting Contract
 * @dev Handles student council elections with 13 positions
 * @author KIBU eVote Team
 */

contract KIBUVoting {
    // ============ STRUCTS ============
    
    /**
     * @dev Represents a candidate running for a position
     */
    struct Candidate {
        uint256 id;             // Unique candidate ID within position
        string name;            // Full name of candidate
        string manifesto;        // Candidate's promises/goals
        string course;          // Course of study
        uint256 year;           // Year of study (1-6)
        uint256 voteCount;      // Number of votes received
        bool isActive;          // Whether candidate is still in race
    }
    
    /**
     * @dev Represents a leadership position (Chairperson, Treasurer, etc.)
     */
    struct Position {
        uint256 id;             // Position ID (0-12)
        string title;           // Position title (e.g., "Chairperson")
        string description;     // Description of role/responsibilities
        Candidate[] candidates; // Array of candidates for this position
        uint256 candidateCount; // Total candidates for this position
        bool isActive;          // Whether position is active in current election
    }
    
    // ============ STATE VARIABLES ============
    
    address public admin;                       // Contract owner/deployer
    bool public votingStarted;                   // Has voting started?
    bool public votingEnded;                     // Has voting ended?
    bool public paused;                          // Emergency pause
    uint256 public votingStartTime;               // Timestamp when voting starts
    uint256 public votingEndTime;                 // Timestamp when voting ends
    
    Position[] public positions;                  // Array of all positions
    uint256 public constant POSITION_COUNT = 13;  // Total number of positions
    
    // Mappings
    mapping(address => mapping(uint256 => bool)) public hasVotedInPosition;  // voter -> positionId -> voted?
    mapping(address => uint256) public voterPositionsCompleted;               // voter -> count of positions voted
    mapping(address => bool) public hasCompletedAllVotes;                     // voter -> finished all 13?
    mapping(uint256 => mapping(address => bool)) public positionVoters;       // positionId -> voter -> voted (for lookup)
    
    // Events
    event PositionAdded(uint256 indexed positionId, string title);
    event CandidateAdded(uint256 indexed positionId, uint256 indexed candidateId, string name);
    event CandidateUpdated(uint256 indexed positionId, uint256 indexed candidateId);
    event VoteCast(address indexed voter, uint256 indexed positionId, uint256 indexed candidateId);
    event VotingStarted(uint256 timestamp);
    event VotingEnded(uint256 timestamp);
    event VotingPaused(address indexed pauser);
    event VotingResumed(address indexed resumer);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    
    // ============ MODIFIERS ============
    
    /**
     * @dev Restricts function to only admin
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "KIBU: Only admin can call this");
        _;
    }
    
    /**
     * @dev Ensures voting is active
     */
    modifier votingActive() {
        require(votingStarted, "KIBU: Voting has not started");
        require(!votingEnded, "KIBU: Voting has ended");
        require(!paused, "KIBU: Voting is paused");
        require(block.timestamp >= votingStartTime, "KIBU: Voting not started yet");
        require(block.timestamp <= votingEndTime, "KIBU: Voting period ended");
        _;
    }
    
    /**
     * @dev Ensures voting has not started (for setup)
     */
    modifier onlyBeforeVoting() {
        require(!votingStarted, "KIBU: Cannot modify after voting starts");
        _;
    }
    
    /**
     * @dev Validates position ID
     */
    modifier validPosition(uint256 _positionId) {
        require(_positionId < positions.length, "KIBU: Invalid position ID");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Sets the contract deployer as admin
     */
    constructor() {
        admin = msg.sender;
        votingStarted = false;
        votingEnded = false;
        paused = false;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Adds a new position to the election
     * @param _title Position title (e.g., "Chairperson")
     * @param _description Description of the position
     */
    function addPosition(string memory _title, string memory _description) 
        public 
        onlyAdmin 
        onlyBeforeVoting 
    {
        require(bytes(_title).length > 0, "KIBU: Title cannot be empty");
        require(positions.length < POSITION_COUNT, "KIBU: Maximum positions reached");
        
        uint256 positionId = positions.length;
        
        Position storage newPosition = positions.push();
        newPosition.id = positionId;
        newPosition.title = _title;
        newPosition.description = _description;
        newPosition.candidateCount = 0;
        newPosition.isActive = true;
        
        emit PositionAdded(positionId, _title);
    }
    
    /**
     * @dev Adds a candidate to a specific position
     * @param _positionId ID of the position
     * @param _name Candidate's full name
     * @param _manifesto Candidate's promises/goals
     * @param _course Candidate's course of study
     * @param _year Candidate's year of study
     */
    function addCandidate(
        uint256 _positionId,
        string memory _name,
        string memory _manifesto,
        string memory _course,
        uint256 _year
    ) 
        public 
        onlyAdmin 
        onlyBeforeVoting 
        validPosition(_positionId) 
    {
        require(bytes(_name).length > 0, "KIBU: Name cannot be empty");
        require(_year >= 1 && _year <= 6, "KIBU: Invalid year");
        
        Position storage position = positions[_positionId];
        uint256 candidateId = position.candidates.length;
        
        Candidate memory newCandidate = Candidate({
            id: candidateId,
            name: _name,
            manifesto: _manifesto,
            course: _course,
            year: _year,
            voteCount: 0,
            isActive: true
        });
        
        position.candidates.push(newCandidate);
        position.candidateCount++;
        
        emit CandidateAdded(_positionId, candidateId, _name);
    }
    
    /**
     * @dev Updates candidate information
     * @param _positionId ID of the position
     * @param _candidateId ID of the candidate
     * @param _name Updated name
     * @param _manifesto Updated manifesto
     * @param _course Updated course
     * @param _year Updated year
     */
    function updateCandidate(
        uint256 _positionId,
        uint256 _candidateId,
        string memory _name,
        string memory _manifesto,
        string memory _course,
        uint256 _year
    )
        public
        onlyAdmin
        onlyBeforeVoting
        validPosition(_positionId)
    {
        Position storage position = positions[_positionId];
        require(_candidateId < position.candidates.length, "KIBU: Invalid candidate ID");
        
        Candidate storage candidate = position.candidates[_candidateId];
        candidate.name = _name;
        candidate.manifesto = _manifesto;
        candidate.course = _course;
        candidate.year = _year;
        
        emit CandidateUpdated(_positionId, _candidateId);
    }
    
    /**
     * @dev Removes a candidate (marks as inactive)
     * @param _positionId ID of the position
     * @param _candidateId ID of the candidate
     */
    function removeCandidate(uint256 _positionId, uint256 _candidateId)
        public
        onlyAdmin
        onlyBeforeVoting
        validPosition(_positionId)
    {
        Position storage position = positions[_positionId];
        require(_candidateId < position.candidates.length, "KIBU: Invalid candidate ID");
        
        position.candidates[_candidateId].isActive = false;
        position.candidateCount--;
        
        emit CandidateUpdated(_positionId, _candidateId);
    }
    
    /**
     * @dev Starts the voting period
     * @param _durationInDays How many days voting will last
     */
    function startVoting(uint256 _durationInDays) 
        public 
        onlyAdmin 
    {
        require(!votingStarted, "KIBU: Voting already started");
        require(positions.length == POSITION_COUNT, "KIBU: All positions not added");
        
        // Verify each position has at least 1 candidate
        for (uint256 i = 0; i < positions.length; i++) {
            require(positions[i].candidateCount > 0, "KIBU: Position has no candidates");
        }
        
        votingStarted = true;
        votingEnded = false;
        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + (_durationInDays * 1 days);
        
        emit VotingStarted(block.timestamp);
    }
    
    /**
     * @dev Ends the voting period manually
     */
    function endVoting() 
        public 
        onlyAdmin 
    {
        require(votingStarted, "KIBU: Voting not started");
        require(!votingEnded, "KIBU: Voting already ended");
        
        votingEnded = true;
        
        emit VotingEnded(block.timestamp);
    }
    
    /**
     * @dev Pauses voting in case of emergency
     */
    function pauseVoting() 
        public 
        onlyAdmin 
    {
        require(votingStarted && !votingEnded, "KIBU: Cannot pause now");
        paused = true;
        
        emit VotingPaused(msg.sender);
    }
    
    /**
     * @dev Resumes voting after pause
     */
    function resumeVoting() 
        public 
        onlyAdmin 
    {
        require(paused, "KIBU: Not paused");
        paused = false;
        
        emit VotingResumed(msg.sender);
    }
    
    // ============ VOTER FUNCTIONS ============
    
    /**
     * @dev Vote for multiple positions in one transaction
     * @param _positionIds Array of position IDs (should be all 13)
     * @param _candidateIds Array of candidate IDs (one per position)
     */
    function vote(uint256[] memory _positionIds, uint256[] memory _candidateIds) 
        public 
        votingActive 
    {
        require(_positionIds.length == _candidateIds.length, "KIBU: Arrays length mismatch");
        require(_positionIds.length > 0, "KIBU: No votes provided");
        
        // Check if voter has already completed all votes
        require(!hasCompletedAllVotes[msg.sender], "KIBU: Already voted all positions");
        
        uint256 votesCast = 0;
        
        for (uint256 i = 0; i < _positionIds.length; i++) {
            uint256 positionId = _positionIds[i];
            uint256 candidateId = _candidateIds[i];
            
            // Validate position
            require(positionId < positions.length, "KIBU: Invalid position ID");
            
            // Check if already voted for this position
            require(!hasVotedInPosition[msg.sender][positionId], "KIBU: Already voted for this position");
            
            Position storage position = positions[positionId];
            require(candidateId < position.candidates.length, "KIBU: Invalid candidate ID");
            require(position.candidates[candidateId].isActive, "KIBU: Candidate not active");
            
            // Record the vote
            position.candidates[candidateId].voteCount++;
            hasVotedInPosition[msg.sender][positionId] = true;
            positionVoters[positionId][msg.sender] = true;
            
            votesCast++;
            
            emit VoteCast(msg.sender, positionId, candidateId);
        }
        
        // Update voter progress
        uint256 totalCompleted = voterPositionsCompleted[msg.sender] + votesCast;
        voterPositionsCompleted[msg.sender] = totalCompleted;
        
        if (totalCompleted == POSITION_COUNT) {
            hasCompletedAllVotes[msg.sender] = true;
        }
    }
    
    /**
     * @dev Vote for a single position (useful for resuming)
     * @param _positionId Position ID
     * @param _candidateId Candidate ID
     */
    function voteSingle(uint256 _positionId, uint256 _candidateId) 
        public 
        votingActive 
        validPosition(_positionId)
    {
        require(!hasCompletedAllVotes[msg.sender], "KIBU: Already voted all positions");
        require(!hasVotedInPosition[msg.sender][_positionId], "KIBU: Already voted for this position");
        
        Position storage position = positions[_positionId];
        require(_candidateId < position.candidates.length, "KIBU: Invalid candidate ID");
        require(position.candidates[_candidateId].isActive, "KIBU: Candidate not active");
        
        // Record the vote
        position.candidates[_candidateId].voteCount++;
        hasVotedInPosition[msg.sender][_positionId] = true;
        positionVoters[_positionId][msg.sender] = true;
        
        // Update voter progress
        uint256 totalCompleted = voterPositionsCompleted[msg.sender] + 1;
        voterPositionsCompleted[msg.sender] = totalCompleted;
        
        if (totalCompleted == POSITION_COUNT) {
            hasCompletedAllVotes[msg.sender] = true;
        }
        
        emit VoteCast(msg.sender, _positionId, _candidateId);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get all positions with their candidates
     * @return Array of all positions
     */
    function getAllPositions() public view returns (Position[] memory) {
        return positions;
    }
    
    /**
     * @dev Get a specific position by ID
     * @param _positionId Position ID
     * @return Position details
     */
    function getPosition(uint256 _positionId) 
        public 
        view 
        validPosition(_positionId) 
        returns (Position memory) 
    {
        return positions[_positionId];
    }
    
    /**
     * @dev Get all candidates for a specific position
     * @param _positionId Position ID
     * @return Array of candidates
     */
    function getCandidates(uint256 _positionId) 
        public 
        view 
        validPosition(_positionId) 
        returns (Candidate[] memory) 
    {
        return positions[_positionId].candidates;
    }
    
    /**
     * @dev Get a specific candidate
     * @param _positionId Position ID
     * @param _candidateId Candidate ID
     * @return Candidate details
     */
    function getCandidate(uint256 _positionId, uint256 _candidateId) 
        public 
        view 
        validPosition(_positionId) 
        returns (Candidate memory) 
    {
        require(_candidateId < positions[_positionId].candidates.length, "KIBU: Invalid candidate ID");
        return positions[_positionId].candidates[_candidateId];
    }
    
    /**
     * @dev Check if a voter has completed all positions
     * @param _voter Voter address
     * @return True if completed all
     */
    function hasVoterCompletedAll(address _voter) public view returns (bool) {
        return hasCompletedAllVotes[_voter];
    }
    
    /**
     * @dev Get number of positions a voter has completed
     * @param _voter Voter address
     * @return Count of completed positions
     */
    function getVoterProgress(address _voter) public view returns (uint256) {
        return voterPositionsCompleted[_voter];
    }
    
    /**
     * @dev Get which positions a voter has completed
     * @param _voter Voter address
     * @return Array of completed position IDs
     */
    function getVoterCompletedPositions(address _voter) public view returns (uint256[] memory) {
        uint256[] memory completed = new uint256[](voterPositionsCompleted[_voter]);
        uint256 index = 0;
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (hasVotedInPosition[_voter][i]) {
                completed[index] = i;
                index++;
            }
        }
        
        return completed;
    }
    
    /**
     * @dev Get results for all positions
     * @return Array of position results with winners
     */
    function getAllResults() public view returns (string[] memory, uint256[] memory, string[] memory) {
        string[] memory winners = new string[](positions.length);
        uint256[] memory winnerVotes = new uint256[](positions.length);
        string[] memory positionNames = new string[](positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            Position storage position = positions[i];
            positionNames[i] = position.title;
            
            uint256 winningVotes = 0;
            uint256 winnerIndex = 0;
            
            for (uint256 j = 0; j < position.candidates.length; j++) {
                if (position.candidates[j].voteCount > winningVotes && position.candidates[j].isActive) {
                    winningVotes = position.candidates[j].voteCount;
                    winnerIndex = j;
                }
            }
            
            if (position.candidates.length > 0) {
                winners[i] = position.candidates[winnerIndex].name;
                winnerVotes[i] = winningVotes;
            } else {
                winners[i] = "No candidates";
                winnerVotes[i] = 0;
            }
        }
        
        return (positionNames, winnerVotes, winners);
    }
    
    /**
     * @dev Get winner for a specific position
     * @param _positionId Position ID
     * @return Winner name and vote count
     */
    function getPositionWinner(uint256 _positionId) 
        public 
        view 
        validPosition(_positionId) 
        returns (string memory, uint256) 
    {
        Position storage position = positions[_positionId];
        require(position.candidates.length > 0, "KIBU: No candidates");
        
        uint256 winningVotes = 0;
        uint256 winnerIndex = 0;
        
        for (uint256 i = 0; i < position.candidates.length; i++) {
            if (position.candidates[i].voteCount > winningVotes && position.candidates[i].isActive) {
                winningVotes = position.candidates[i].voteCount;
                winnerIndex = i;
            }
        }
        
        return (position.candidates[winnerIndex].name, winningVotes);
    }
    
    /**
     * @dev Get total votes cast across all positions
     * @return Total vote count
     */
    function getTotalVotes() public view returns (uint256) {
        uint256 total = 0;
        
        for (uint256 i = 0; i < positions.length; i++) {
            for (uint256 j = 0; j < positions[i].candidates.length; j++) {
                total += positions[i].candidates[j].voteCount;
            }
        }
        
        return total;
    }
    
    /**
     * @dev Get unique voter count
     * @return Number of unique voters who have voted at least once
     */
    function getUniqueVoterCount() public view returns (uint256) {
        // This is a simplification - in reality you'd need a mapping
        // For now, we'll return a placeholder
        return 0;
    }
    
    /**
     * @dev Get voting status
     * @return Status string and current time
     */
    function getVotingStatus() public view returns (string memory, uint256, uint256, bool) {
        if (!votingStarted) {
            return ("Not Started", 0, 0, false);
        } else if (votingEnded) {
            return ("Ended", votingStartTime, votingEndTime, true);
        } else if (paused) {
            return ("Paused", votingStartTime, votingEndTime, false);
        } else {
            return ("Active", votingStartTime, votingEndTime, true);
        }
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    /**
     * @dev Emergency withdraw in case of issues (only admin)
     */
    function emergencyWithdraw() public onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "KIBU: No balance");
        
        payable(admin).transfer(balance);
        
        emit EmergencyWithdraw(admin, balance);
    }
    
    /**
     * @dev Transfer admin role to new address
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "KIBU: Invalid address");
        admin = _newAdmin;
    }
    
    /**
     * @dev Get contract version
     */
    function getVersion() public pure returns (string memory) {
        return "KIBU eVote v2.0 - Multi-Position";
    }
}